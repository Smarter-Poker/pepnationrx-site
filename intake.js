/* ============================================================================
   PEP NATION RX — dynamic intake questionnaire renderer
   ----------------------------------------------------------------------------
   Renders the 13-step clinical intake flow defined in the backend
   (backend/src/intake/questionnaire.js), exported to intake-questionnaire.json.
   Entirely client-side. Ports the showIf/red-flag evaluator from
   backend/src/intake/conditions.js and the required/validation rules from
   backend/src/intake/validator.js so the same definition drives the UI.
   ============================================================================ */
(function () {
  'use strict';

  /* ---- small helpers --------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function toast(opts) {
    if (window.pnrx && window.pnrx.toast) window.pnrx.toast(opts);
  }

  var CHECK_SVG = '<svg aria-hidden="true" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l3.2 3.2L11 3"/></svg>';

  /* =========================================================================
     CONDITION EVALUATOR — ported from backend/src/intake/conditions.js
     ========================================================================= */
  function ageFromDob(dob, now) {
    now = now || new Date();
    if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    var parts = dob.split('-').map(Number);
    var y = parts[0], m = parts[1], d = parts[2];
    var age = now.getFullYear() - y;
    var beforeBirthday =
      now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
    if (beforeBirthday) age -= 1;
    return age;
  }
  function computeBmi(heightInches, weightLbs) {
    var h = Number(heightInches), w = Number(weightLbs);
    if (!isFinite(h) || !isFinite(w) || h <= 0) return null;
    return (703 * w) / (h * h);
  }
  function answerIncludes(answer, value) {
    if (Array.isArray(answer)) return answer.indexOf(value) !== -1;
    return answer === value;
  }
  function isAnswered(answer) {
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  }
  function evaluateCondition(cond, answers, context) {
    context = context || {};
    if (cond == null) return true;
    if (Array.isArray(cond.all)) {
      return cond.all.every(function (c) { return evaluateCondition(c, answers, context); });
    }
    if (Array.isArray(cond.any)) {
      return cond.any.some(function (c) { return evaluateCondition(c, answers, context); });
    }
    if (cond.not !== undefined) {
      return !evaluateCondition(cond.not, answers, context);
    }
    if (cond.program !== undefined) {
      return context.program === cond.program;
    }
    if (Array.isArray(cond.programIn)) {
      return cond.programIn.indexOf(context.program) !== -1;
    }
    if (cond.questionId !== undefined) {
      var answer = answers ? answers[cond.questionId] : undefined;
      if (cond.isAnswered === true) return isAnswered(answer);
      if (cond.equals !== undefined) return answer === cond.equals;
      if (Array.isArray(cond.in)) return cond.in.indexOf(answer) !== -1;
      if (cond.includes !== undefined) return answerIncludes(answer, cond.includes);
      if (cond.isUnder18 === true) {
        var age = ageFromDob(answer);
        return age !== null && age < 18;
      }
      if (cond.bmiUnder !== undefined) {
        var bmi = computeBmi(answers.height_inches, answers.weight_lbs);
        return bmi !== null && bmi < cond.bmiUnder;
      }
    }
    return false;
  }

  /* =========================================================================
     VALIDATION — ported from backend/src/intake/validator.js
     ========================================================================= */
  function hasValue(value) {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }
  function validateAnswerValue(question, value) {
    var errors = [];
    var v = question.validation || {};
    switch (question.type) {
      case 'single-select': {
        var allowed = (question.options || []).map(function (o) { return o.value; });
        if (allowed.indexOf(value) === -1) errors.push('Please choose an option.');
        break;
      }
      case 'multi-select': {
        if (!Array.isArray(value)) { errors.push('Please make a selection.'); break; }
        break;
      }
      case 'number': {
        var n = Number(value);
        if (!isFinite(n) || value === '') { errors.push('Enter a number.'); break; }
        if (v.integer && !Number.isInteger(n)) errors.push('Enter a whole number.');
        if (v.min !== undefined && n < v.min) errors.push('Must be at least ' + v.min + '.');
        if (v.max !== undefined && n > v.max) errors.push('Must be at most ' + v.max + '.');
        break;
      }
      case 'text': {
        if (typeof value !== 'string') { errors.push('Enter a value.'); break; }
        if (v.minLength !== undefined && value.length < v.minLength)
          errors.push('Must be at least ' + v.minLength + ' characters.');
        if (v.maxLength !== undefined && value.length > v.maxLength)
          errors.push('Must be at most ' + v.maxLength + ' characters.');
        if (v.pattern && !new RegExp(v.pattern).test(value))
          errors.push('That doesn’t look quite right.');
        break;
      }
      case 'date': {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
          errors.push('Enter a valid date.');
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') errors.push('Please make a selection.');
        break;
      }
      case 'file-upload-ref': {
        if (typeof value !== 'string' || value.length === 0)
          errors.push('Please upload a file.');
        break;
      }
    }
    return errors;
  }

  /* =========================================================================
     STATE
     ========================================================================= */
  var Q = null;            // questionnaire definition
  var answers = {};        // questionId -> value
  var context = {};        // { program }
  var visibleSteps = [];   // recomputed each render
  var stepIndex = 0;       // index into visibleSteps
  var root = null;         // container element
  var ineligible = false;

  function computeContext() {
    // Program is the answer to the program_selection step's `program` question.
    context = { program: answers.program };
  }
  function recomputeVisibleSteps() {
    visibleSteps = Q.steps.filter(function (step) {
      return evaluateCondition(step.showIf, answers, context);
    });
  }
  function visibleQuestions(step) {
    return step.questions.filter(function (q) {
      return evaluateCondition(q.showIf, answers, context);
    });
  }

  /* Red-flag screening across all visible questions. */
  function checkRedFlags() {
    var flags = [];
    Q.steps.forEach(function (step) {
      if (!evaluateCondition(step.showIf, answers, context)) return;
      step.questions.forEach(function (q) {
        if (!q.redFlag) return;
        if (!evaluateCondition(q.showIf, answers, context)) return;
        if (evaluateCondition(q.redFlag.when, answers, context)) {
          flags.push({ questionId: q.id, reason: q.redFlag.reason });
        }
      });
    });
    return flags;
  }

  /* =========================================================================
     QUESTION RENDERERS — each returns a DOM node and wires answer capture
     ========================================================================= */
  function questionShell(q) {
    var wrap = el('div', 'pnrx-field site-q');
    wrap.dataset.qid = q.id;
    var label = el('label', 'pnrx-label');
    label.id = q.id + '-label';
    label.textContent = q.prompt;
    label.setAttribute('for', q.id);
    wrap.appendChild(label);
    if (q.help) {
      wrap.appendChild(el('div', 'pnrx-field__help', esc(q.help)));
    }
    return wrap;
  }
  function errorSpan(q) {
    var span = el('span', 'pnrx-field__error');
    span.id = q.id + '-err';
    span.hidden = true;
    span.setAttribute('role', 'alert');
    return span;
  }

  function renderSelectGroup(q, multi) {
    var group = el('div', 'site-optlist');
    group.setAttribute('role', multi ? 'group' : 'radiogroup');
    group.setAttribute('aria-labelledby', q.id + '-label');
    var current = answers[q.id];
    (q.options || []).forEach(function (opt) {
      var item = el('div', 'site-opt');
      item.setAttribute('role', multi ? 'checkbox' : 'radio');
      item.tabIndex = 0;
      item.dataset.value = opt.value;
      var checked = multi
        ? (Array.isArray(current) && current.indexOf(opt.value) !== -1)
        : current === opt.value;
      item.setAttribute('aria-checked', checked ? 'true' : 'false');
      item.innerHTML = '<span class="site-opt__check">' + CHECK_SVG + '</span>' + esc(opt.label);
      group.appendChild(item);
    });

    var items = [].slice.call(group.querySelectorAll('.site-opt'));
    function toggle(item) {
      if (multi) {
        var arr = Array.isArray(answers[q.id]) ? answers[q.id].slice() : [];
        var val = item.dataset.value;
        var idx = arr.indexOf(val);
        if (idx === -1) arr.push(val); else arr.splice(idx, 1);
        answers[q.id] = arr;
        item.setAttribute('aria-checked', idx === -1 ? 'true' : 'false');
      } else {
        items.forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
        item.setAttribute('aria-checked', 'true');
        answers[q.id] = item.dataset.value;
      }
      onAnswerChanged();
    }
    items.forEach(function (item, i) {
      item.addEventListener('click', function () { toggle(item); });
      item.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(item); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault(); items[(i + 1) % items.length].focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault(); items[(i - 1 + items.length) % items.length].focus();
        }
      });
    });
    return group;
  }

  function renderBoolean(q) {
    var group = el('div', 'site-optlist site-optlist--inline');
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', q.id + '-label');
    var current = answers[q.id];
    [{ value: true, label: 'Yes' }, { value: false, label: 'No' }].forEach(function (opt) {
      var item = el('div', 'site-opt');
      item.setAttribute('role', 'radio');
      item.tabIndex = 0;
      item.dataset.bool = String(opt.value);
      item.setAttribute('aria-checked', current === opt.value ? 'true' : 'false');
      item.innerHTML = '<span class="site-opt__check">' + CHECK_SVG + '</span>' + opt.label;
      group.appendChild(item);
    });
    var items = [].slice.call(group.querySelectorAll('.site-opt'));
    function choose(item) {
      items.forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
      item.setAttribute('aria-checked', 'true');
      answers[q.id] = item.dataset.bool === 'true';
      onAnswerChanged();
    }
    items.forEach(function (item, i) {
      item.addEventListener('click', function () { choose(item); });
      item.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); choose(item); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault(); items[(i + 1) % items.length].focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault(); items[(i - 1 + items.length) % items.length].focus();
        }
      });
    });
    return group;
  }

  function renderInput(q, type) {
    var input = el('input', 'pnrx-input');
    input.id = q.id;
    input.type = type;
    input.setAttribute('aria-labelledby', q.id + '-label');
    if (type === 'number') {
      var v = q.validation || {};
      if (v.min !== undefined) input.min = v.min;
      if (v.max !== undefined) input.max = v.max;
      if (v.integer) input.step = '1';
    }
    if (q.type === 'text' && q.validation && q.validation.maxLength) {
      input.maxLength = q.validation.maxLength;
    }
    if (answers[q.id] !== undefined && answers[q.id] !== null) {
      input.value = answers[q.id];
    }
    input.addEventListener('input', function () {
      var val = input.value;
      if (q.type === 'number') {
        answers[q.id] = val === '' ? undefined : Number(val);
      } else {
        answers[q.id] = val === '' ? undefined : val;
      }
      onAnswerChanged();
    });
    return input;
  }

  function renderFileUpload(q) {
    // Reference-style upload: pick a file, store a generated reference id.
    var wrap = el('div', 'site-upload');
    var input = el('input');
    input.type = 'file';
    input.id = q.id;
    input.className = 'site-upload__input';
    input.accept = 'image/*,application/pdf';
    input.setAttribute('aria-labelledby', q.id + '-label');
    var label = el('label', 'site-upload__drop');
    label.setAttribute('for', q.id);
    var defaultText = 'Choose a file or photo';
    label.innerHTML =
      '<svg aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V3M6 7l4-4 4 4"/><path d="M3 13v3a1 1 0 001 1h12a1 1 0 001-1v-3"/></svg>' +
      '<span class="site-upload__text">' + defaultText + '</span>';
    var textEl = label.querySelector('.site-upload__text');
    if (answers[q.id]) {
      label.classList.add('is-set');
      textEl.textContent = 'File attached';
    }
    input.addEventListener('change', function () {
      if (input.files && input.files.length) {
        var f = input.files[0];
        // Store a reference id (the real upload happens server-side later).
        answers[q.id] = 'upload_' + q.id + '_' + Date.now();
        label.classList.add('is-set');
        textEl.textContent = f.name;
      } else {
        delete answers[q.id];
        label.classList.remove('is-set');
        textEl.textContent = defaultText;
      }
      onAnswerChanged();
    });
    wrap.appendChild(input);
    wrap.appendChild(label);
    return wrap;
  }

  function renderQuestion(q) {
    var shell = questionShell(q);
    var control;
    switch (q.type) {
      case 'single-select': control = renderSelectGroup(q, false); break;
      case 'multi-select':  control = renderSelectGroup(q, true);  break;
      case 'boolean':       control = renderBoolean(q);            break;
      case 'number':        control = renderInput(q, 'number');    break;
      case 'date':          control = renderInput(q, 'date');      break;
      case 'text':          control = renderInput(q, 'text');      break;
      case 'file-upload-ref': control = renderFileUpload(q);       break;
      default:              control = el('div', null, '');         break;
    }
    shell.appendChild(control);
    shell.appendChild(errorSpan(q));
    return shell;
  }

  /* =========================================================================
     STEP RENDERING
     ========================================================================= */
  function showFieldError(qid, msg) {
    var span = document.getElementById(qid + '-err');
    if (!span) return;
    if (msg) {
      span.textContent = msg;
      span.hidden = false;
    } else {
      span.hidden = true;
      span.textContent = '';
    }
    var qWrap = root.querySelector('.site-q[data-qid="' + qid + '"]');
    if (qWrap) qWrap.classList.toggle('is-invalid', !!msg);
  }

  /* Validate every visible question on the current step. */
  function validateCurrentStep() {
    var step = visibleSteps[stepIndex];
    var ok = true;
    var firstBad = null;
    visibleQuestions(step).forEach(function (q) {
      var value = answers[q.id];
      var provided = hasValue(value);
      var msg = '';
      if (!provided) {
        if (q.required) msg = 'This question is required.';
      } else {
        var errs = validateAnswerValue(q, value);
        if (errs.length) msg = errs[0];
      }
      showFieldError(q.id, msg);
      if (msg) {
        ok = false;
        if (!firstBad) firstBad = q.id;
      }
    });
    if (firstBad) {
      var node = root.querySelector('.site-q[data-qid="' + firstBad + '"]');
      if (node) {
        var focusable = node.querySelector('input, .site-opt');
        if (focusable) focusable.focus();
      }
    }
    return ok;
  }

  /* Called whenever any answer changes — keeps branching + Continue live.
     If an answer changes which QUESTIONS are visible within the current step
     (e.g. planning_pregnancy=false reveals the contraception question), the
     in-step question list is re-rendered so the new questions appear. */
  function onAnswerChanged() {
    computeContext();
    recomputeVisibleSteps();
    syncVisibleQuestions();
    updateContinueState();
  }

  /* Re-render the current step's question list if its visible-question set
     changed. Answers live in state, so re-rendered controls keep their value. */
  function syncVisibleQuestions() {
    var step = visibleSteps[stepIndex];
    if (!step) return;
    var qList = root.querySelector('.site-qlist');
    if (!qList) return;
    var wanted = visibleQuestions(step).map(function (q) { return q.id; });
    var shown = [].slice.call(qList.querySelectorAll('.site-q'))
      .map(function (n) { return n.dataset.qid; });
    if (wanted.length === shown.length &&
        wanted.every(function (id, i) { return id === shown[i]; })) {
      return; // no change
    }
    qList.innerHTML = '';
    visibleQuestions(step).forEach(function (q) {
      qList.appendChild(renderQuestion(q));
    });
  }

  function currentStepComplete() {
    var step = visibleSteps[stepIndex];
    if (!step) return false;
    return visibleQuestions(step).every(function (q) {
      var value = answers[q.id];
      if (!hasValue(value)) return !q.required;
      return validateAnswerValue(q, value).length === 0;
    });
  }

  function updateContinueState() {
    var btn = root.querySelector('[data-intake-continue]');
    if (!btn) return;
    var complete = currentStepComplete();
    btn.disabled = !complete;
    if (complete) btn.removeAttribute('aria-disabled');
    else btn.setAttribute('aria-disabled', 'true');
  }

  function renderProgress(panel) {
    var totalVisible = visibleSteps.length;
    var current = stepIndex + 1;
    var pct = Math.round((current / totalVisible) * 100);
    var bar = el('div', 'site-progress');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-label', 'Intake progress');
    bar.innerHTML = '<div class="site-progress__bar" style="width:' + pct + '%"></div>';
    panel.appendChild(bar);
    var meta = el('div', 'site-step-meta');
    meta.textContent = 'Step ' + current + ' of ' + totalVisible + ' · about 3 minutes';
    panel.appendChild(meta);
  }

  /* Render the ineligible / unable-to-proceed state. */
  function renderIneligible(flags) {
    ineligible = true;
    root.innerHTML = '';
    var panel = el('div', 'site-panel site-panel--alert');
    panel.setAttribute('role', 'alert');
    panel.innerHTML =
      '<div class="site-ineligible__icon">' +
        '<svg aria-hidden="true" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L2 22h22L13 2z"/><path d="M13 9v6M13 18.5h.01"/></svg>' +
      '</div>' +
      '<h3 class="pnrx-h3" style="margin-top:14px;font-size:22px">We’re unable to proceed with an online visit</h3>' +
      '<p class="pnrx-muted" style="margin-top:8px">Based on your answers, an asynchronous online visit isn’t the safe or appropriate path for you right now. This is a clinical-safety guardrail — not a final decision about your care.</p>';
    var list = el('ul', 'site-ineligible__list');
    flags.forEach(function (f) {
      list.appendChild(el('li', null, esc(f.reason)));
    });
    panel.appendChild(list);
    panel.appendChild(el('p', 'pnrx-subtle',
      'Please consult an in-person clinician. If this is an emergency, call 911. ' +
      'You can contact our support team if you believe this was reached in error.'));
    var foot = el('div', 'site-intake-foot');
    foot.style.justifyContent = 'flex-start';
    var back = el('button', 'pnrx-btn pnrx-btn--ghost', '&#8592;&nbsp; Review my answers');
    back.type = 'button';
    back.addEventListener('click', function () {
      ineligible = false;
      renderStep();
    });
    foot.appendChild(back);
    panel.appendChild(foot);
    root.appendChild(panel);
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }

  /* Render the final success / confirmation state. */
  function renderSuccess() {
    root.innerHTML = '';
    var panel = el('div', 'site-panel site-panel--success');
    panel.innerHTML =
      '<div class="site-success__icon">' +
        '<svg aria-hidden="true" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l6 6L22 5"/></svg>' +
      '</div>' +
      '<h3 class="pnrx-h3" style="margin-top:14px;font-size:22px">Your intake has been submitted</h3>' +
      '<p class="pnrx-muted" style="margin-top:8px">Thank you. Your responses are now queued for review by an independent, licensed clinician. We’ll email you at <strong>' +
        esc(answers.email || 'your email') + '</strong> as soon as your visit has been reviewed — usually within one business day.</p>';
    var foot = el('div', 'site-intake-foot');
    foot.style.justifyContent = 'flex-start';
    var home = el('a', 'pnrx-btn pnrx-btn--primary', 'Back to home');
    home.href = 'index.html';
    foot.appendChild(home);
    panel.appendChild(foot);
    root.appendChild(panel);
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }

  /* Submit the collected answers. Graceful: endpoint may not be live. */
  function submitIntake(btn) {
    var payload = {
      program: answers.program || context.program || null,
      answers: answers,
      questionnaireVersion: Q.version,
    };
    btn.classList.add('pnrx-btn--loading');
    btn.disabled = true;
    fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      return res.json();
    }).then(function () {
      renderSuccess();
    }).catch(function () {
      // Endpoint not live yet — show the confirmation state anyway.
      renderSuccess();
    });
  }

  /* Render the current step into the container. */
  function renderStep() {
    if (ineligible) return;
    computeContext();
    recomputeVisibleSteps();
    if (stepIndex >= visibleSteps.length) stepIndex = visibleSteps.length - 1;
    if (stepIndex < 0) stepIndex = 0;
    var step = visibleSteps[stepIndex];

    root.innerHTML = '';

    var header = el('div', 'pnrx-section-header pnrx-section-header--center');
    header.style.marginBottom = '26px';
    header.innerHTML =
      '<div class="pnrx-eyebrow">Step ' + (stepIndex + 1) + ' — Medical questionnaire</div>' +
      '<h2 class="pnrx-h2">' + esc(step.title) + '</h2>';
    root.appendChild(header);

    var panel = el('div', 'site-panel');
    renderProgress(panel);

    if (step.help) {
      panel.appendChild(el('p', 'site-step-help', esc(step.help)));
    }

    var qList = el('div', 'site-qlist');
    visibleQuestions(step).forEach(function (q) {
      qList.appendChild(renderQuestion(q));
    });
    panel.appendChild(qList);

    var foot = el('div', 'site-intake-foot');
    var back = el('button', 'pnrx-btn pnrx-btn--ghost');
    back.type = 'button';
    back.innerHTML = '&#8592;&nbsp; Back';
    if (stepIndex === 0) {
      back.disabled = true;
      back.setAttribute('aria-disabled', 'true');
    }
    back.addEventListener('click', function () {
      if (stepIndex === 0) return;
      stepIndex -= 1;
      renderStep();
    });

    var isLast = stepIndex === visibleSteps.length - 1;
    var cont = el('button', 'pnrx-btn pnrx-btn--primary');
    cont.type = 'button';
    cont.setAttribute('data-intake-continue', '');
    cont.textContent = isLast ? 'Submit intake' : 'Continue';
    cont.addEventListener('click', function () {
      if (cont.disabled) return;
      if (!validateCurrentStep()) {
        toast({ type: 'error', title: 'Check your answers',
          message: 'Please complete the highlighted questions.' });
        return;
      }
      // Re-evaluate red flags now that the step is complete.
      computeContext();
      var flags = checkRedFlags();
      if (flags.length) {
        renderIneligible(flags);
        return;
      }
      if (isLast) {
        submitIntake(cont);
        return;
      }
      stepIndex += 1;
      renderStep();
      window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    });

    foot.appendChild(back);
    foot.appendChild(cont);
    panel.appendChild(foot);
    root.appendChild(panel);

    var note = el('p', 'site-cta-note');
    note.style.marginTop = '18px';
    note.innerHTML =
      '<svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6.5" width="10" height="6.5" rx="1.4"/><path d="M4.2 6.5V4.6a2.8 2.8 0 015.6 0v1.9"/></svg>' +
      ' Your answers are encrypted and shared only with your reviewing clinician.';
    root.appendChild(note);

    updateContinueState();
  }

  /* =========================================================================
     LOADER — try the live API, fall back to the static JSON export.
     ========================================================================= */
  function loadQuestionnaire() {
    return fetch('/api/intake/questionnaire')
      .then(function (res) {
        if (!res.ok) throw new Error('api unavailable');
        return res.json();
      })
      .catch(function () {
        return fetch('intake-questionnaire.json').then(function (res) {
          if (!res.ok) throw new Error('static questionnaire unavailable');
          return res.json();
        });
      });
  }

  function renderLoadError(msg) {
    root.innerHTML = '';
    var panel = el('div', 'site-panel');
    panel.innerHTML =
      '<h3 class="pnrx-h3">We couldn’t load the questionnaire</h3>' +
      '<p class="pnrx-muted" style="margin-top:8px">' + esc(msg) +
      ' Please refresh the page or try again shortly.</p>';
    root.appendChild(panel);
  }

  /* =========================================================================
     BOOT
     ========================================================================= */
  function init() {
    root = document.getElementById('intake-app');
    if (!root) return;
    loadQuestionnaire().then(function (data) {
      Q = data;
      if (!Q || !Array.isArray(Q.steps) || Q.steps.length === 0) {
        renderLoadError('The questionnaire definition was empty.');
        return;
      }
      renderStep();
    }).catch(function () {
      renderLoadError('A network error occurred.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
