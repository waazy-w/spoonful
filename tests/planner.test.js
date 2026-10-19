// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/planner.js');

const TODAY = new Date(2026, 9, 20); // Oct 20, 2026
let nextId = 1;
function task(over) {
  return Object.assign({ id: 't' + nextId++, title: 'Task', cost: 1, due: null, mustDo: false, steps: [], done: false, createdAt: nextId }, over);
}
function steps(n, doneCount) {
  return Array.from({ length: n }, (_, i) => ({ id: 's' + nextId++, title: 'Step ' + i, done: i < (doneCount || 0) }));
}

test('keeps a one-spoon reserve on days with 4+ spoons', () => {
  assert.equal(P.reserveFor(3), 0);
  assert.equal(P.reserveFor(4), 1);
  const plan = P.buildPlan([task({ cost: 5 })], { budget: 5, today: TODAY });
  assert.equal(plan.available, 4);
  assert.equal(plan.planned.length, 0, 'a 5-spoon task must not fit a 5-spoon day once the reserve is held');
});

test('never plans more than the available energy', () => {
  const tasks = [task({ cost: 3 }), task({ cost: 2 }), task({ cost: 2 }), task({ cost: 1 })];
  for (let budget = 0; budget <= 10; budget++) {
    const plan = P.buildPlan(tasks, { budget, today: TODAY });
    const total = plan.planned.reduce((s, p) => s + p.spoons, 0);
    assert.ok(total <= plan.available + 1e-9, `budget ${budget}: planned ${total} > available ${plan.available}`);
    assert.equal(plan.planned.length + plan.deferred.length, tasks.length, 'every open task is either planned or deferred');
  }
});

test('must-do and due-soon tasks come before nice-to-haves', () => {
  const easy = task({ title: 'easy', cost: 1 });
  const dueToday = task({ title: 'due', cost: 2, due: '2026-10-20' });
  const must = task({ title: 'must', cost: 2, mustDo: true });
  const plan = P.buildPlan([easy, dueToday, must], { budget: 5, today: TODAY }); // 4 available
  assert.deepEqual(plan.planned.map(p => p.task.title), ['must', 'due']);
  assert.equal(plan.deferred[0].task.title, 'easy');
  assert.equal(plan.deferred[0].reason, 'no-room');
});

test('spent spoons shrink what is left to plan', () => {
  const plan = P.buildPlan([task({ cost: 2 }), task({ cost: 2 })], { budget: 6, spent: 3, today: TODAY });
  assert.equal(plan.available, 2);
  assert.equal(plan.planned.length, 1);
});

test('an urgent task that is too big and has no steps asks to be broken down', () => {
  const big = task({ cost: 5, mustDo: true });
  const plan = P.buildPlan([big], { budget: 3, today: TODAY });
  assert.equal(plan.deferred[0].reason, 'too-big');
});

test('an urgent task with steps is partially planned (first steps that fit)', () => {
  const big = task({ cost: 4, mustDo: true, steps: steps(4) }); // 1 spoon per step
  const plan = P.buildPlan([big], { budget: 3, today: TODAY }); // 3 available, no reserve
  assert.equal(plan.planned.length, 1);
  assert.equal(plan.planned[0].partial, true);
  assert.equal(plan.planned[0].stepIds.length, 3);
  assert.equal(plan.planned[0].spoons, 3);
});

test('a task bigger than the whole day is flagged too-big even if not urgent', () => {
  const plan = P.buildPlan([task({ cost: 5, due: '2026-10-21' })], { budget: 4, today: TODAY }); // 3 available
  assert.equal(plan.deferred[0].reason, 'too-big');
});

test('a task that merely lost out to others just waits', () => {
  const plan = P.buildPlan([task({ cost: 2, mustDo: true }), task({ cost: 2 })], { budget: 4, today: TODAY });
  assert.equal(plan.deferred[0].reason, 'no-room');
});

test('a non-urgent task bigger than the day, once broken down, gets started', () => {
  const big = task({ cost: 5, steps: steps(5) });
  const plan = P.buildPlan([big], { budget: 4, today: TODAY }); // 3 available
  assert.equal(plan.planned[0].partial, true);
  assert.equal(plan.planned[0].stepIds.length, 3);
});

test('a broken-down task due soon gets its first steps planned in leftover energy', () => {
  const must = task({ title: 'must', cost: 3, mustDo: true });
  const report = task({ title: 'report', cost: 4, due: '2026-10-21', steps: steps(4) });
  const plan = P.buildPlan([must, report], { budget: 6, today: TODAY }); // 5 available, 2 left after must
  const r = plan.planned.find(p => p.task.title === 'report');
  assert.ok(r && r.partial);
  assert.equal(r.stepIds.length, 2);
});

test('completed steps reduce the remaining cost', () => {
  const t = task({ cost: 4, steps: steps(4, 3) });
  assert.equal(P.remainingCost(t), 1);
  assert.equal(P.remainingCost(task({ cost: 3, done: true })), 0);
});

test('done tasks are ignored', () => {
  const plan = P.buildPlan([task({ cost: 1, done: true })], { budget: 5, today: TODAY });
  assert.equal(plan.planned.length + plan.deferred.length, 0);
});

test('very low energy days mark deferrals as rest, not failure', () => {
  const plan = P.buildPlan([task({ cost: 3 })], { budget: 1, today: TODAY });
  assert.equal(plan.deferred[0].reason, 'rest');
});

test('overdue beats due tomorrow', () => {
  const tomorrow = task({ title: 'tomorrow', cost: 1, due: '2026-10-21' });
  const overdue = task({ title: 'overdue', cost: 1, due: '2026-10-18' });
  const plan = P.buildPlan([tomorrow, overdue], { budget: 2, today: TODAY });
  assert.equal(plan.planned[0].task.title, 'overdue');
});

test('step suggestions match the kind of task', () => {
  assert.match(P.suggestSteps('Write history essay')[0], /blank document/);
  assert.match(P.suggestSteps('Reply to professor email')[1], /one sentence/);
  assert.match(P.suggestSteps('Book dentist appointment')[0], /number or booking link/);
  const fallback = P.suggestSteps('Untangle the garden hose');
  assert.equal(fallback.length, 3);
  assert.match(fallback[0], /garden hose/);
});

test('date helpers', () => {
  assert.equal(P.daysUntil('2026-10-20', TODAY), 0);
  assert.equal(P.daysUntil('2026-10-19', TODAY), -1);
  assert.equal(P.daysUntil(null, TODAY), null);
  assert.equal(P.toDateString(TODAY), '2026-10-20');
});
