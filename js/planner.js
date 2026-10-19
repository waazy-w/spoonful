/*
 * Spoonful planning engine.
 * Pure functions only: no DOM, no storage. Shared by the browser app and the Node tests.
 *
 * A task: { id, title, cost (1-5 spoons), due ('YYYY-MM-DD' | null), mustDo, steps: [{ id, title, done }], done, createdAt }
 */
(function (root) {
  'use strict';

  var DAY_MS = 86400000;
  var EPSILON = 1e-9;

  function startOfDay(date) {
    var d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDate(str) {
    if (!str) return null;
    var parts = String(str).split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function toDateString(date) {
    var d = new Date(date);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  /** Whole days from today until the due date. Negative = overdue, null = no due date. */
  function daysUntil(due, today) {
    var d = parseDate(due);
    if (!d) return null;
    return Math.round((startOfDay(d) - startOfDay(today)) / DAY_MS);
  }

  /** Round to the nearest half spoon, so the UI never shows 1.3333 spoons. */
  function roundHalf(n) {
    return Math.round(n * 2) / 2;
  }

  function remainingSteps(task) {
    return (task.steps || []).filter(function (s) { return !s.done; });
  }

  /** A task's cost is split evenly across its steps. */
  function stepCost(task) {
    var n = (task.steps || []).length;
    return n ? task.cost / n : task.cost;
  }

  function remainingCost(task) {
    if (task.done) return 0;
    var steps = task.steps || [];
    if (!steps.length) return task.cost;
    return roundHalf(stepCost(task) * remainingSteps(task).length);
  }

  /** Higher = more pressing. Must-do and due dates dominate; the cost tie-break happens in sorting. */
  function urgency(task, today) {
    var score = 0;
    if (task.mustDo) score += 1000;
    var d = daysUntil(task.due, today);
    if (d !== null) {
      if (d < 0) score += 500;
      else if (d === 0) score += 400;
      else if (d === 1) score += 300;
      else if (d <= 3) score += 200;
      else if (d <= 7) score += 100;
    }
    return score;
  }

  var URGENT = 400; // must-do, overdue, or due today
  var SOON = 200;   // due within 3 days: worth making a start on, even partially

  /** Keep one spoon back on any day with 4 or more, so the plan never spends you to zero. */
  function reserveFor(budget) {
    return budget >= 4 ? 1 : 0;
  }

  /**
   * Build today's plan.
   * @param {Array} tasks
   * @param {{budget:number, spent?:number, today?:Date}} opts
   * @returns {{planned:Array, deferred:Array, budget:number, reserve:number, spent:number, available:number, planCost:number}}
   *   planned:  [{ task, spoons, stepIds, partial }]
   *   deferred: [{ task, reason: 'too-big' | 'step-too-big' | 'no-room' | 'rest' }]
   */
  function buildPlan(tasks, opts) {
    var budget = Math.max(0, Number(opts.budget) || 0);
    var spent = Math.max(0, Number(opts.spent) || 0);
    var today = opts.today || new Date();
    var reserve = reserveFor(budget);
    var available = Math.max(0, budget - reserve - spent);
    var left = available;

    var ranked = tasks
      .filter(function (t) { return remainingCost(t) > 0; })
      .map(function (t) { return { task: t, urgency: urgency(t, today), cost: remainingCost(t) }; })
      .sort(function (a, b) {
        return (b.urgency - a.urgency) ||
          (a.cost - b.cost) ||
          ((a.task.createdAt || 0) - (b.task.createdAt || 0));
      });

    var planned = [];
    var deferred = [];

    ranked.forEach(function (item) {
      var task = item.task;
      var steps = remainingSteps(task);

      if (item.cost <= left + EPSILON) {
        planned.push({ task: task, spoons: item.cost, stepIds: steps.map(function (s) { return s.id; }), partial: false });
        left -= item.cost;
        return;
      }

      var urgent = item.urgency >= URGENT;
      // A task bigger than the whole day will never fit as one piece, however long it waits.
      var neverFits = item.cost > available + EPSILON;

      if (steps.length && (item.urgency >= SOON || neverFits)) {
        // Make a start: plan as many of its steps as fit.
        var each = stepCost(task);
        var count = Math.floor((left + EPSILON) / each);
        if (count >= 1) {
          var take = steps.slice(0, count);
          var spoons = roundHalf(each * take.length);
          planned.push({ task: task, spoons: spoons, stepIds: take.map(function (s) { return s.id; }), partial: true });
          left = Math.max(0, left - spoons);
          return;
        }
      }

      var reason;
      if (!urgent && available <= 1) reason = 'rest';
      else if (!steps.length && (urgent || neverFits)) reason = 'too-big';
      else if (steps.length && urgent) reason = 'step-too-big';
      else reason = 'no-room';
      deferred.push({ task: task, reason: reason });
    });

    return {
      planned: planned,
      deferred: deferred,
      budget: budget,
      reserve: reserve,
      spent: spent,
      available: available,
      planCost: roundHalf(available - left)
    };
  }

  /* ---------- Step suggestions (rule-based, offline, no AI) ---------- */

  var TEMPLATES = [
    { match: /\b(write|essay|report|paper|draft|blog|cover letter)\b/i, steps: [
      'Open a blank document and give it a title',
      'Write 3 rough bullet points: no full sentences needed',
      'Turn one bullet into a paragraph',
      'Read it once and fix just one thing'] },
    { match: /\b(study|revise|revision|exam|test|quiz|flashcards?)\b/i, steps: [
      'Pick ONE topic to cover',
      'Skim your notes on it for 10 minutes',
      'Write 3 questions from memory',
      'Check your answers against the notes'] },
    { match: /\b(email|e-mail|message|reply|respond|text|dm)\b/i, steps: [
      'Open the conversation',
      'Write one sentence saying what you need',
      'Add a greeting and press send'] },
    { match: /\b(clean|tidy|laundry|dishes|vacuum|room|kitchen)\b/i, steps: [
      'Set a 5-minute timer',
      'Clear one surface only',
      'Put away 5 things, then stop if you want'] },
    { match: /\b(apply|application|form|fafsa|visa|scholarship|internship)\b/i, steps: [
      'Open the form and bookmark it',
      'Fill in the name and contact sections',
      'List the documents it asks for',
      'Fill in one more section'] },
    { match: /\b(call|phone|appointment|book|schedule|doctor|dentist)\b/i, steps: [
      'Find the number or booking link',
      'Write down what to say in 2 lines',
      'Make the call or booking'] },
    { match: /\b(read|reading|chapter|article|book)\b/i, steps: [
      'Open to the right page',
      'Read 2 pages',
      'Write a one-sentence summary'] },
    { match: /\b(code|coding|bug|project|assignment|homework|lab|problem set|pset)\b/i, steps: [
      'Open the project or assignment brief',
      'Write down what "done" looks like in one line',
      'Do the smallest piece first',
      'Save and note where to pick up next time'] },
    { match: /\b(shop|shopping|groceries|buy|order)\b/i, steps: [
      'Write the list (just the must-haves)',
      'Pick store or delivery',
      'Get the first 3 items'] }
  ];

  function suggestSteps(title) {
    var text = String(title || '').trim();
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].match.test(text)) return TEMPLATES[i].steps.slice();
    }
    var name = text || 'this task';
    return [
      'Gather what you need for "' + name + '"',
      'Do just 10 minutes of it',
      'Write down where you stopped and the next step'
    ];
  }

  var api = {
    buildPlan: buildPlan,
    suggestSteps: suggestSteps,
    remainingCost: remainingCost,
    stepCost: stepCost,
    urgency: urgency,
    daysUntil: daysUntil,
    reserveFor: reserveFor,
    roundHalf: roundHalf,
    toDateString: toDateString
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Planner = api;
})(typeof self !== 'undefined' ? self : this);
