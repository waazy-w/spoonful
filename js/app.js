/*
 * Spoonful UI. Vanilla JS: state -> render(), with one delegated event handler per event type.
 */
(function () {
  'use strict';

  var P = window.Planner;
  var S = window.Store;

  var state = S.load();
  var view = 'today';
  var openTaskId = null;   // task whose details panel is expanded
  var skipped = [];        // focus-queue keys skipped this session ("Not now")
  var timer = { start: null, handle: null };
  var toastHandle = null;

  var COSTS = [
    { v: 1, label: 'Tiny', hint: 'A few minutes, barely any effort.' },
    { v: 2, label: 'Small', hint: 'Short, but needs some focus.' },
    { v: 3, label: 'Medium', hint: 'A solid block of effort.' },
    { v: 4, label: 'Big', hint: 'Draining, so plan rest after.' },
    { v: 5, label: 'Huge', hint: 'A whole good day’s energy.' }
  ];
  var PRESETS = [
    { v: 2, label: 'Empty' },
    { v: 4, label: 'Low' },
    { v: 6, label: 'Okay' },
    { v: 8, label: 'Good' },
    { v: 10, label: 'Great' }
  ];
  // Deferred tasks are grouped by reason, so each explanation is written once.
  var GROUPS = [
    { reason: 'too-big', title: 'Too big for today', note: 'Break these into small steps and part of them can fit, even today.', action: true },
    { reason: 'step-too-big', title: 'Steps still too big', note: 'Even one step is more than you have left. Try smaller steps, or let it wait.', action: true },
    { reason: 'no-room', title: 'Can wait', note: 'Your energy is already spoken for today. These can wait.', collapse: true },
    { reason: 'rest', title: 'Resting today', note: 'Today is for resting. Rest is part of the plan.', collapse: true }
  ];

  var SPOON_PATH = '<ellipse cx="8" cy="8" rx="6" ry="7.5"/><rect x="6.5" y="14" width="3" height="17" rx="1.5"/>';

  /* ---------- helpers ---------- */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function spoonText(n) {
    var r = P.roundHalf(n);
    return r + (r === 1 ? ' spoon' : ' spoons');
  }

  function cost(n) {
    var r = P.roundHalf(n);
    return '<span class="cost"><svg class="mini-spoon" aria-hidden="true" viewBox="0 0 16 32">' + SPOON_PATH + '</svg>' +
      '<span aria-hidden="true">' + r + '</span><span class="sr-only">' + spoonText(r) + '</span></span>';
  }

  function dueTag(task) {
    var d = P.daysUntil(task.due, new Date());
    if (d === null) return '';
    if (d < 0) return '<span class="tag urgent">Overdue</span>';
    if (d === 0) return '<span class="tag urgent">Due today</span>';
    if (d === 1) return '<span class="tag">Due tomorrow</span>';
    var parts = task.due.split('-').map(Number);
    return '<span class="tag">Due ' + new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + '</span>';
  }

  function mustTag(task) {
    return task.mustDo ? '<span class="tag urgent">Must do</span>' : '';
  }

  function findTask(id) {
    return state.tasks.find(function (t) { return t.id === id; });
  }

  function spent() {
    return P.roundHalf(state.day.log.reduce(function (sum, e) { return sum + e.spoons; }, 0));
  }

  function currentPlan() {
    if (state.day.spoons == null) return null;
    return P.buildPlan(state.tasks, { budget: state.day.spoons, spent: spent() });
  }

  function persist() {
    if (!S.save(state)) notify('Couldn’t save. Your browser storage may be full or turned off.');
  }

  function notify(message) {
    var live = $('#live');
    live.textContent = '';
    // A fresh text node makes screen readers re-announce identical messages.
    setTimeout(function () { live.textContent = message; }, 50);
    var toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastHandle);
    toastHandle = setTimeout(function () { toast.hidden = true; }, 4000);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  /* ---------- state changes ---------- */

  function setSpoons(n) {
    state.day.spoons = Math.min(12, Math.max(0, Math.round(n)));
    persist();
    render();
    var plan = currentPlan();
    notify(spoonText(state.day.spoons) + ' today. ' + plan.planned.length + ' planned, ' + plan.deferred.length + ' can wait.');
  }

  function addTask(fields) {
    var task = {
      id: uid(),
      title: fields.title,
      cost: fields.cost,
      due: fields.due || null,
      mustDo: !!fields.mustDo,
      steps: [],
      done: false,
      createdAt: Date.now()
    };
    state.tasks.push(task);
    persist();
    return task;
  }

  function logEntry(task, step, spoons, stepIds) {
    state.day.log.push({
      id: uid(), taskId: task.id, stepId: step ? step.id : null, stepIds: stepIds || [],
      title: step ? step.title + ' (' + task.title + ')' : task.title,
      spoons: spoons, at: Date.now()
    });
  }

  function completeTask(task) {
    var spoons = P.remainingCost(task);
    var ids = [];
    task.steps.forEach(function (s) { if (!s.done) { s.done = true; ids.push(s.id); } });
    task.done = true;
    task.doneAt = Date.now();
    logEntry(task, null, spoons, ids);
  }

  function completeStep(task, step) {
    step.done = true;
    logEntry(task, step, P.stepCost(task));
    if (task.steps.every(function (s) { return s.done; })) {
      task.done = true;
      task.doneAt = Date.now();
    }
  }

  function uncompleteStep(task, step) {
    step.done = false;
    task.done = false;
    state.day.log = state.day.log.filter(function (e) { return e.stepId !== step.id; });
  }

  function undoEntry(entryId) {
    var entry = state.day.log.find(function (e) { return e.id === entryId; });
    if (!entry) return;
    var task = findTask(entry.taskId);
    if (task) {
      task.done = false;
      task.steps.forEach(function (s) {
        if (s.id === entry.stepId || entry.stepIds.indexOf(s.id) !== -1) s.done = false;
      });
    }
    state.day.log = state.day.log.filter(function (e) { return e !== entry; });
  }

  /* ---------- focus queue ---------- */

  function focusQueue() {
    var plan = currentPlan();
    if (!plan) return [];
    var items = [];
    plan.planned.forEach(function (p) {
      if (p.task.steps.length) {
        p.stepIds.forEach(function (sid) {
          var step = p.task.steps.find(function (s) { return s.id === sid; });
          if (step && !step.done) items.push({ key: p.task.id + ':' + sid, task: p.task, step: step });
        });
      } else {
        items.push({ key: p.task.id, task: p.task, step: null });
      }
    });
    var front = items.filter(function (i) { return skipped.indexOf(i.key) === -1; });
    var back = skipped.map(function (k) { return items.find(function (i) { return i.key === k; }); }).filter(Boolean);
    return front.concat(back);
  }

  function itemTitle(item) {
    return item.step ? item.step.title : item.task.title;
  }

  /* ---------- rendering ---------- */

  function applySettings() {
    var s = state.settings;
    var html = document.documentElement;
    html.setAttribute('data-text-size', s.textSize);
    html.classList.toggle('readable', !!s.readable);
    html.classList.toggle('contrast', !!s.contrast);
    html.classList.toggle('reduce-motion', !!s.reduceMotion);
    if (s.theme === 'auto') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', s.theme);
  }

  function renderNav() {
    $all('[data-nav]').forEach(function (b) {
      if (!b.classList.contains('tab')) return;
      if (b.getAttribute('data-nav') === view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $all('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; });
  }

  /** A row of spoon icons: used, planned, free, and the reserve. */
  function spoonMeter(plan) {
    var free = Math.max(0, P.roundHalf(plan.budget - plan.reserve - plan.spent - plan.planCost));
    var dots = '';
    for (var i = 0; i < Math.min(12, plan.budget); i++) {
      var mid = i + 0.5, cls;
      if (mid < plan.spent) cls = 'used';
      else if (mid < plan.spent + plan.planCost) cls = 'planned';
      else if (mid >= plan.budget - plan.reserve) cls = 'reserve';
      else cls = 'free';
      dots += '<svg class="spoon ' + cls + '" viewBox="0 0 16 32">' + SPOON_PATH + '</svg>';
    }
    var legend = [];
    if (plan.spent) legend.push('<span><i class="key used"></i>' + P.roundHalf(plan.spent) + ' used</span>');
    legend.push('<span><i class="key planned"></i>' + plan.planCost + ' planned</span>');
    if (free) legend.push('<span><i class="key free"></i>' + free + ' free</span>');
    if (plan.reserve) legend.push('<span><i class="key reserve"></i>' + plan.reserve + ' in reserve</span>');

    var sentence = 'You have ' + spoonText(plan.budget) + '.' +
      (plan.spent ? ' You’ve used ' + spoonText(plan.spent) + '.' : '') +
      ' The plan uses ' + spoonText(plan.planCost) + '.' +
      (plan.reserve ? ' ' + spoonText(plan.reserve) + ' is kept in reserve for the unexpected.' : '');

    return '<div class="meter" aria-hidden="true">' + dots + '</div>' +
      '<p class="legend" aria-hidden="true">' + legend.join('') + '</p>' +
      '<p class="sr-only">' + sentence + '</p>';
  }

  function row(t, spoons, extra) {
    return '<div class="row-main"><span class="title">' + esc(t.title) + '</span>' + (extra || '') + '</div>' +
      '<div class="row-meta">' + mustTag(t) + dueTag(t) + cost(spoons) + '</div>';
  }

  function renderToday() {
    var spoons = state.day.spoons;

    $('#today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    $('#presets').innerHTML = PRESETS.map(function (p) {
      var id = 'preset-' + p.v;
      return '<div class="seg"><input type="radio" name="preset" id="' + id + '" value="' + p.v + '" data-key="' + id + '"' +
        (spoons === p.v ? ' checked' : '') + '><label for="' + id + '"><span class="seg-label">' + p.label + '</span><span class="seg-num">' + p.v + '<span class="sr-only"> spoons</span></span></label></div>';
    }).join('');

    var count = $('#spoon-count');
    if (document.activeElement !== count) count.value = spoons == null ? '' : spoons;

    var out = $('#today-plan');
    if (!state.tasks.length) {
      out.innerHTML = '<div class="empty"><h2>No tasks yet</h2><p>Add what’s on your mind, and Spoonful will work out what fits today.</p>' +
        '<div class="button-row center"><button type="button" class="btn primary" data-nav="tasks" data-key="empty-add">Add your first task</button>' +
        '<button type="button" class="btn" data-action="load-sample" data-key="empty-sample">Try it with example tasks</button></div></div>';
      return;
    }
    if (spoons == null) {
      out.innerHTML = '<div class="empty"><p>Pick your energy above to see today’s plan.</p></div>';
      return;
    }

    var plan = currentPlan();
    var html = '<section class="card" aria-labelledby="h-plan"><div class="card-head"><h2 id="h-plan">Today’s plan</h2></div>' + spoonMeter(plan);

    if (plan.budget <= 2) html += '<p class="note-box">Low-energy day. Only the essentials are planned. Being gentle with yourself counts as progress.</p>';

    if (plan.planned.length) {
      html += '<ol class="rows plan-list">' + plan.planned.map(function (p, i) {
        var t = p.task, sub = '';
        if (t.steps.length) {
          var remaining = t.steps.filter(function (s) { return !s.done; }).length;
          sub = '<span class="sub">' + (p.partial
            ? 'Just the first ' + p.stepIds.length + ' of ' + remaining + ' steps today'
            : remaining + ' step' + (remaining === 1 ? '' : 's') + ' left') + '</span>';
        }
        return '<li class="row plan-item"><span class="num" aria-hidden="true">' + (i + 1) + '</span>' + row(t, p.spoons, sub) + '</li>';
      }).join('') + '</ol>' +
        '<button type="button" class="btn primary block" data-nav="focus" data-key="start-focus">Start Focus: one thing at a time</button>';
    } else {
      html += '<p class="quiet">' + (plan.available <= 0 ? 'Your energy for today is used up. That’s a full day. Rest now.' : 'Nothing fits right now, and that’s okay.') + '</p>';
    }
    html += '</section>';

    if (plan.deferred.length) {
      html += '<section class="card" aria-labelledby="h-later"><div class="card-head"><h2 id="h-later">Not today, and that’s okay</h2></div>';
      GROUPS.forEach(function (g) {
        var items = plan.deferred.filter(function (d) { return d.reason === g.reason; });
        if (!items.length) return;
        var list = '<ul class="rows defer-list">' + items.map(function (d) {
          var t = d.task;
          var action = g.action
            ? '<button type="button" class="btn small" data-action="breakdown" data-id="' + t.id + '" data-key="bd-' + t.id + '">Break it down<span class="sr-only">: ' + esc(t.title) + '</span></button>'
            : '';
          return '<li class="row">' + row(t, P.remainingCost(t)) + action + '</li>';
        }).join('') + '</ul>';
        if (g.collapse) {
          html += '<details class="group" id="group-' + g.reason + '"><summary><span class="group-title">' + items.length + ' task' + (items.length === 1 ? '' : 's') + ' can wait</span>' +
            '<span class="group-note reason">' + g.note + '</span></summary>' + list + '</details>';
        } else {
          html += '<div class="group"><p class="group-title">' + g.title + '</p><p class="group-note reason">' + g.note + '</p>' + list + '</div>';
        }
      });
      html += '</section>';
    }

    if (state.day.log.length) {
      html += '<section class="card" aria-labelledby="h-done"><div class="card-head"><h2 id="h-done">Done today</h2><span class="head-meta">' + spoonText(plan.spent) + ' used</span></div>' +
        '<ul class="rows done-list">' + state.day.log.map(function (e) {
          return '<li class="row"><span class="tick" aria-hidden="true">✓</span><div class="row-main"><span class="title">' + esc(e.title) + '</span></div>' +
            '<div class="row-meta">' + cost(e.spoons) +
            '<button type="button" class="btn link" data-action="undo" data-id="' + e.id + '" data-key="undo-' + e.id + '">Undo<span class="sr-only">: ' + esc(e.title) + '</span></button></div></li>';
        }).join('') + '</ul></section>';
    }

    out.innerHTML = html;
  }

  function renderCostOptions() {
    $('#cost-options').innerHTML = COSTS.map(function (c) {
      var id = 'cost-' + c.v;
      return '<div class="seg"><input type="radio" name="cost" id="' + id + '" value="' + c.v + '"' + (c.v === 2 ? ' checked' : '') + ' aria-describedby="cost-hint">' +
        '<label for="' + id + '"><span class="seg-label">' + c.label + '</span><span class="seg-num">' + c.v + '<span class="sr-only"> ' + (c.v === 1 ? 'spoon' : 'spoons') + '</span></span></label></div>';
    }).join('');
    updateCostHint();
  }

  function updateCostHint() {
    var checked = $('#cost-options input:checked');
    var c = COSTS.find(function (x) { return String(x.v) === (checked && checked.value); });
    $('#cost-hint').textContent = c ? c.label + ' · ' + spoonText(c.v) + '. ' + c.hint : '';
  }

  function renderTaskPanel(t) {
    var suggestions = P.suggestSteps(t.title).filter(function (s) {
      return !t.steps.some(function (st) { return st.title === s; });
    });
    var html = '<div class="task-panel" id="panel-' + t.id + '">';
    html += '<div class="panel-fields">' +
      '<div class="field compact"><label for="cost-' + t.id + '">Energy</label><select id="cost-' + t.id + '" data-field="cost" data-id="' + t.id + '" data-key="fcost-' + t.id + '">' +
      COSTS.map(function (c) { return '<option value="' + c.v + '"' + (c.v === t.cost ? ' selected' : '') + '>' + c.label + ' (' + spoonText(c.v) + ')</option>'; }).join('') +
      '</select></div>' +
      '<div class="field compact"><label for="due-' + t.id + '">Due</label><input type="date" id="due-' + t.id + '" value="' + esc(t.due || '') + '" data-field="due" data-id="' + t.id + '" data-key="fdue-' + t.id + '"></div>' +
      '<div class="check"><input type="checkbox" id="must-' + t.id + '"' + (t.mustDo ? ' checked' : '') + ' data-field="mustDo" data-id="' + t.id + '" data-key="fmust-' + t.id + '"><label for="must-' + t.id + '">Must happen today</label></div>' +
      '</div>';

    html += '<h3 class="panel-h" id="steps-h-' + t.id + '">Steps' + (t.steps.length ? ' <span class="hint">about ' + spoonText(P.stepCost(t)) + ' each</span>' : '') + '</h3>';
    if (t.steps.length) {
      html += '<ol class="step-list" aria-labelledby="steps-h-' + t.id + '">' + t.steps.map(function (s) {
        var id = 'step-' + s.id;
        return '<li class="check"><input type="checkbox" id="' + id + '"' + (s.done ? ' checked' : '') + ' data-action="step-toggle" data-id="' + t.id + '" data-step="' + s.id + '" data-key="' + id + '">' +
          '<label for="' + id + '"' + (s.done ? ' class="done"' : '') + '>' + esc(s.title) + '</label>' +
          '<button type="button" class="btn link quiet-link" data-action="step-remove" data-id="' + t.id + '" data-step="' + s.id + '" data-key="rm-' + s.id + '">Remove<span class="sr-only"> step: ' + esc(s.title) + '</span></button></li>';
      }).join('') + '</ol>';
    } else {
      html += '<p class="hint">Big tasks feel lighter in small pieces, and then part of them can fit a low-energy day.</p>';
    }

    html += '<form class="add-step" data-action="add-step" data-id="' + t.id + '">' +
      '<label for="step-input-' + t.id + '" class="sr-only">Add a step to ' + esc(t.title) + '</label>' +
      '<input type="text" id="step-input-' + t.id + '" autocomplete="off" placeholder="Add a step…" data-key="step-input-' + t.id + '">' +
      '<button type="submit" class="btn" data-key="step-add-' + t.id + '">Add</button></form>';

    if (suggestions.length) {
      html += '<div class="suggestions"><p class="sugg-head" id="sugg-h-' + t.id + '">Suggested steps <span class="hint">built in, no AI</span></p>' +
        '<ul class="chips" aria-labelledby="sugg-h-' + t.id + '">' + suggestions.map(function (s, i) {
          return '<li><button type="button" class="chip" data-action="add-suggested" data-id="' + t.id + '" data-text="' + esc(s) + '" data-key="sg-' + t.id + '-' + i + '"><span aria-hidden="true">+ </span>' + esc(s) + '</button></li>';
        }).join('') + '</ul>' +
        '<button type="button" class="btn small" data-action="add-all-suggested" data-id="' + t.id + '" data-key="sg-all-' + t.id + '">Add all</button></div>';
    }
    html += '<div class="panel-foot"><button type="button" class="btn link danger" data-action="task-delete" data-id="' + t.id + '" data-key="del-' + t.id + '">Delete task<span class="sr-only">: ' + esc(t.title) + '</span></button></div>';
    return html + '</div>';
  }

  function renderTasks() {
    var open = state.tasks.filter(function (t) { return !t.done; });
    var done = state.tasks.filter(function (t) { return t.done; });
    var html = '<section class="card" aria-labelledby="h-todo"><div class="card-head"><h2 id="h-todo">To do</h2><span class="head-meta">' + open.length + '</span></div>';

    if (!open.length) {
      html += '<p class="quiet">Nothing on your list. Add something above, or enjoy the quiet.</p>';
    } else {
      html += '<ul class="rows task-list">' + open.map(function (t) {
        var expanded = openTaskId === t.id;
        var doneSteps = t.steps.filter(function (s) { return s.done; }).length;
        var sub = t.steps.length ? '<span class="sub">' + doneSteps + ' of ' + t.steps.length + ' steps done</span>' : '';
        return '<li class="task-item' + (expanded ? ' open' : '') + '"><div class="row">' +
          '<button type="button" class="circle-check" data-action="task-done" data-id="' + t.id + '" data-key="done-' + t.id + '"><span class="sr-only">Mark done: ' + esc(t.title) + '</span></button>' +
          '<button type="button" class="row-toggle" data-action="toggle-details" data-id="' + t.id + '" aria-expanded="' + expanded + '" aria-controls="panel-' + t.id + '" data-key="det-' + t.id + '">' +
          '<span class="title">' + esc(t.title) + '</span>' + sub + '<span class="sr-only">, details and steps</span></button>' +
          '<div class="row-meta">' + mustTag(t) + dueTag(t) + cost(P.remainingCost(t)) +
          '<svg class="chev" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
          '</div>' + (expanded ? renderTaskPanel(t) : '') + '</li>';
      }).join('') + '</ul>';
    }
    html += '</section>';

    if (done.length) {
      html += '<details class="card completed" id="completed"><summary>Completed <span class="head-meta">' + done.length + '</span></summary><ul class="rows done-list">' + done.map(function (t) {
        return '<li class="row"><span class="tick" aria-hidden="true">✓</span><div class="row-main"><span class="title">' + esc(t.title) + '</span></div>' +
          '<button type="button" class="btn link" data-action="task-restore" data-id="' + t.id + '" data-key="rest-' + t.id + '">Restore<span class="sr-only">: ' + esc(t.title) + '</span></button></li>';
      }).join('') + '</ul><button type="button" class="btn small" data-action="clear-completed" data-key="clear-completed">Clear completed</button></details>';
    }

    $('#task-list').innerHTML = html;
  }

  function renderFocus() {
    var out = $('#focus-body');
    if (state.day.spoons == null) {
      out.innerHTML = '<div class="empty"><p>Check in on the Today page first, so Focus knows what fits.</p>' +
        '<button type="button" class="btn primary" data-nav="today" data-key="focus-to-today">Go to Today</button></div>';
      return;
    }
    var queue = focusQueue();
    if (!queue.length) {
      var count = state.day.log.length;
      out.innerHTML = '<div class="card focus-card"><h2 id="focus-title" class="focus-title" tabindex="-1">' + (count ? 'That’s everything planned.' : 'Nothing planned right now.') + '</h2>' +
        '<p class="quiet">' + (count ? 'You finished ' + count + ' thing' + (count === 1 ? '' : 's') + ' and used ' + spoonText(spent()) + '. Rest is the next step.' : 'Rest counts too.') + '</p>' +
        '<button type="button" class="btn" data-nav="today" data-key="focus-to-today">Back to Today</button></div>';
      stopTimer();
      return;
    }

    var item = queue[0];
    var t = item.task;
    var eyebrow = 'One thing now';
    if (item.step) eyebrow = 'Step ' + (t.steps.indexOf(item.step) + 1) + ' of ' + t.steps.length + ' · ' + esc(t.title);
    var next = queue[1];
    var position = '<span class="dots" aria-hidden="true">' + queue.map(function (q, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</span>';

    out.innerHTML = '<div class="card focus-card">' +
      '<p class="eyebrow">' + eyebrow + '</p>' +
      '<h2 id="focus-title" class="focus-title" tabindex="-1">' + esc(itemTitle(item)) + '</h2>' +
      '<div class="focus-meta">' + mustTag(t) + dueTag(t) + cost(item.step ? P.stepCost(t) : t.cost) + '</div>' +
      '<button type="button" class="btn primary block big" data-action="focus-done" data-key="focus-done">Done</button>' +
      '<div class="focus-secondary">' +
      '<button type="button" class="btn ghost" data-action="focus-skip" data-key="focus-skip">Not now</button>' +
      '<button type="button" class="btn ghost" data-action="focus-breakdown" data-id="' + t.id + '" data-key="focus-bd">Too big?</button>' +
      '<button type="button" class="btn ghost" data-action="focus-speak" data-key="focus-speak">Read aloud</button>' +
      (timer.start
        ? '<button type="button" class="btn ghost" data-action="timer-stop" data-key="timer">Stop timer <span class="timer" role="timer" aria-live="off" id="timer-out">' + formatElapsed() + '</span></button>'
        : '<button type="button" class="btn ghost" data-action="timer-start" data-key="timer" aria-describedby="timer-hint">Gentle timer</button>') +
      '</div>' +
      (timer.start ? '' : '<p class="hint center" id="timer-hint">The timer counts up, never down.</p>') +
      '<div class="up-next">' + position + '<span>' + (next ? 'Then: ' + esc(itemTitle(next)) : 'Last one for today') + '</span></div>' +
      '</div>';
  }

  function formatElapsed() {
    var secs = Math.floor((Date.now() - timer.start) / 1000);
    var m = Math.floor(secs / 60), s = secs % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function startTimer() {
    timer.start = Date.now();
    clearInterval(timer.handle);
    timer.handle = setInterval(function () {
      var el = $('#timer-out');
      if (el) el.textContent = formatElapsed();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timer.handle);
    timer.start = null;
    timer.handle = null;
  }

  function renderSettings() {
    var form = $('#settings-form');
    var s = state.settings;
    $all('input[type=radio]', form).forEach(function (r) { r.checked = s[r.name] === r.value; });
    $all('input[type=checkbox]', form).forEach(function (c) { c.checked = !!s[c.name]; });
  }

  function render() {
    var active = document.activeElement;
    var key = active && active.getAttribute && active.getAttribute('data-key');
    var openDetails = $all('details[open][id]').map(function (d) { return d.id; });

    applySettings();
    renderNav();
    renderToday();
    renderTasks();
    renderFocus();
    renderSettings();

    openDetails.forEach(function (id) { var d = document.getElementById(id); if (d) d.open = true; });
    if (key) {
      var el = document.querySelector('[data-key="' + key + '"]');
      if (el && el !== document.activeElement && !el.closest('[hidden]')) el.focus();
    }
  }

  function go(name, opts) {
    view = name;
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* file:// in some browsers */ }
    render();
    if (!opts || !opts.keepFocus) {
      var target = name === 'focus' ? $('#focus-title') : null;
      (target || $('#h-' + name)).focus();
    }
    window.scrollTo(0, 0);
  }

  function breakdown(id) {
    openTaskId = id;
    go('tasks', { keepFocus: true });
    var input = $('#step-input-' + id);
    if (input) {
      input.scrollIntoView({ block: 'center' });
      input.focus();
    }
    notify('Add small steps for "' + findTask(id).title + '", or pick from the suggestions.');
  }

  /* ---------- sample data ---------- */

  function addDays(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return P.toDateString(d);
  }

  function loadSample() {
    var studySteps = P.suggestSteps('Study for stats quiz');
    var samples = [
      { title: 'Reply to group project email', cost: 1, due: addDays(0) },
      { title: 'Book doctor’s appointment', cost: 2, mustDo: true },
      { title: 'Finish lab report for Bio 201', cost: 5, due: addDays(1) },
      { title: 'Study for stats quiz', cost: 3, due: addDays(3), steps: studySteps },
      { title: 'Do laundry', cost: 2 },
      { title: 'Read chapter 5 for English', cost: 2, due: addDays(6) },
      { title: 'Apply for campus library job', cost: 4 }
    ];
    samples.forEach(function (s, i) {
      var t = addTask({ title: s.title, cost: s.cost, due: s.due, mustDo: s.mustDo });
      t.createdAt = Date.now() + i;
      if (s.steps) t.steps = s.steps.map(function (title) { return { id: uid(), title: title, done: false }; });
    });
    persist();
    render();
    notify('Added 7 example tasks.');
  }

  /* ---------- events ---------- */

  document.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-nav]');
    if (nav) { go(nav.getAttribute('data-nav')); return; }

    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    var task = id ? findTask(id) : null;

    switch (action) {
      case 'spoons-up': setSpoons((state.day.spoons || 0) + 1); break;
      case 'spoons-down': setSpoons((state.day.spoons || 0) - 1); break;

      case 'breakdown': breakdown(id); break;

      case 'undo':
        undoEntry(id); persist(); render();
        notify('Undone. It’s back on your list.');
        $('#h-today').focus();
        break;

      case 'toggle-details':
        openTaskId = openTaskId === id ? null : id;
        render();
        break;

      case 'task-done':
        completeTask(task); persist(); render();
        notify('Done: ' + task.title + '. Nice work.');
        $('#h-tasks').focus();
        break;

      case 'task-delete':
        if (window.confirm('Delete "' + task.title + '"? This can’t be undone.')) {
          state.tasks = state.tasks.filter(function (t) { return t !== task; });
          if (openTaskId === id) openTaskId = null;
          persist(); render();
          notify('Deleted ' + task.title + '.');
          $('#h-tasks').focus();
        }
        break;

      case 'task-restore':
        task.done = false;
        task.steps.forEach(function (s) { s.done = false; });
        persist(); render();
        notify(task.title + ' is back on your to-do list.');
        break;

      case 'clear-completed':
        state.tasks = state.tasks.filter(function (t) { return !t.done; });
        persist(); render();
        notify('Cleared completed tasks.');
        $('#h-tasks').focus();
        break;

      case 'step-remove':
        task.steps = task.steps.filter(function (s) { return s.id !== btn.getAttribute('data-step'); });
        persist(); render();
        notify('Step removed.');
        var input = $('#step-input-' + id);
        if (input) input.focus();
        break;

      case 'add-suggested':
        task.steps.push({ id: uid(), title: btn.getAttribute('data-text'), done: false });
        persist(); render();
        notify('Added step: ' + btn.getAttribute('data-text'));
        if (!document.activeElement || document.activeElement === document.body) {
          var next = $('#panel-' + id + ' .chip') || $('#step-input-' + id);
          if (next) next.focus();
        }
        break;

      case 'add-all-suggested':
        P.suggestSteps(task.title).forEach(function (s) {
          if (!task.steps.some(function (st) { return st.title === s; })) task.steps.push({ id: uid(), title: s, done: false });
        });
        persist(); render();
        notify(task.steps.length + ' steps added to ' + task.title + '.');
        $('#step-input-' + id).focus();
        break;

      case 'focus-done': {
        var item = focusQueue()[0];
        if (!item) break;
        if (item.step) completeStep(item.task, item.step); else completeTask(item.task);
        skipped = skipped.filter(function (k) { return k !== item.key; });
        persist(); render();
        var after = focusQueue()[0];
        notify('Done: ' + itemTitle(item) + '.' + (after ? ' Next: ' + itemTitle(after) + '.' : ' That’s everything planned.'));
        if (after && state.settings.readAloud) speak('Next: ' + itemTitle(after));
        if (!after) $('#focus-title').focus();
        break;
      }

      case 'focus-skip': {
        var cur = focusQueue();
        if (cur.length < 2) { notify('This is the only thing left. It’s fine to stop here for today.'); break; }
        skipped = skipped.filter(function (k) { return k !== cur[0].key; }).concat(cur[0].key);
        render();
        notify('Moved to later. Now: ' + itemTitle(focusQueue()[0]) + '.');
        if (state.settings.readAloud) speak(itemTitle(focusQueue()[0]));
        break;
      }

      case 'focus-breakdown': breakdown(id); break;

      case 'focus-speak': {
        var q = focusQueue();
        if (q[0]) speak(itemTitle(q[0]));
        break;
      }

      case 'timer-start': startTimer(); render(); break;
      case 'timer-stop': {
        var elapsed = formatElapsed();
        stopTimer(); render();
        notify('Timer stopped at ' + elapsed + '.');
        break;
      }

      case 'export': {
        var blob = new Blob([S.exportJSON(state)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'spoonful-backup-' + P.toDateString(new Date()) + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        notify('Backup downloaded.');
        break;
      }

      case 'load-sample': loadSample(); break;

      case 'clear-all':
        if (window.confirm('Delete all tasks and today’s check-in? Your settings are kept.')) {
          var settings = state.settings;
          state = S.defaults();
          state.settings = settings;
          openTaskId = null; skipped = [];
          persist(); render();
          notify('Everything deleted.');
        }
        break;
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;

    if (el.name === 'preset') { setSpoons(Number(el.value)); return; }
    if (el.id === 'spoon-count') { if (el.value !== '') setSpoons(Number(el.value)); return; }
    if (el.name === 'cost' && el.closest('#add-task')) { updateCostHint(); return; }

    if (el.closest('#settings-form')) {
      state.settings[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      persist(); render();
      return;
    }

    if (el.getAttribute('data-action') === 'step-toggle') {
      var task = findTask(el.getAttribute('data-id'));
      var step = task.steps.find(function (s) { return s.id === el.getAttribute('data-step'); });
      if (el.checked) completeStep(task, step); else uncompleteStep(task, step);
      var finished = task.done;
      if (finished) openTaskId = null;
      persist(); render();
      notify(el.checked ? (finished ? 'All steps done. ' + task.title + ' is complete!' : 'Step done.') : 'Step marked not done.');
      if (finished) $('#h-tasks').focus();
      return;
    }

    var field = el.getAttribute('data-field');
    if (field) {
      var t = findTask(el.getAttribute('data-id'));
      if (field === 'cost') t.cost = Number(el.value);
      else if (field === 'due') t.due = el.value || null;
      else if (field === 'mustDo') t.mustDo = el.checked;
      persist(); render();
      notify('Saved.');
    }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    e.preventDefault();

    if (form.id === 'checkin') return;

    if (form.id === 'add-task') {
      var titleInput = $('#task-title');
      var title = titleInput.value.trim();
      var err = $('#title-error');
      if (!title) {
        err.hidden = false;
        titleInput.setAttribute('aria-invalid', 'true');
        titleInput.focus();
        return;
      }
      err.hidden = true;
      titleInput.removeAttribute('aria-invalid');
      var task = addTask({
        title: title,
        cost: Number((form.querySelector('input[name=cost]:checked') || { value: 2 }).value),
        due: $('#task-due').value,
        mustDo: $('#task-must').checked
      });
      titleInput.value = '';
      $('#task-due').value = '';
      $('#task-must').checked = false;
      render();
      var plan = currentPlan();
      var where = '';
      if (plan) {
        var inPlan = plan.planned.some(function (p) { return p.task === task; });
        where = inPlan ? ' It fits in today’s plan.' : ' It doesn’t fit today, so it’s waiting.';
      }
      notify('Added "' + task.title + '".' + where);
      titleInput.focus();
      return;
    }

    if (form.getAttribute('data-action') === 'add-step') {
      var id = form.getAttribute('data-id');
      var input = $('#step-input-' + id);
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      findTask(id).steps.push({ id: uid(), title: text, done: false });
      persist(); render();
      notify('Added step: ' + text);
      $('#step-input-' + id).focus();
    }
  });

  $('#import-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    file.text().then(function (text) {
      var next = S.importJSON(text);
      if (!window.confirm('Replace your current tasks with the ' + next.tasks.length + ' tasks in this backup?')) return;
      state = next;
      openTaskId = null; skipped = [];
      persist(); render();
      notify('Backup restored: ' + state.tasks.length + ' tasks.');
    }).catch(function () {
      notify('That file isn’t a Spoonful backup.');
    }).then(function () { e.target.value = ''; });
  });

  // A new day can begin while the app is open (e.g. a laptop left on overnight).
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (state.day.date !== P.toDateString(new Date())) {
      state.day = S.freshDay();
      skipped = [];
      persist(); render();
    }
  });

  /* ---------- boot ---------- */

  renderCostOptions();
  var initial = (location.hash || '').slice(1);
  view = ['today', 'tasks', 'focus', 'settings'].indexOf(initial) !== -1 ? initial : 'today';
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
  }
})();
