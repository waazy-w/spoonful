/*
 * Local-only persistence. Nothing leaves the device.
 */
(function (root) {
  'use strict';

  var KEY = 'spoonful:v1';

  function todayString() {
    return root.Planner.toDateString(new Date());
  }

  function freshDay() {
    return { date: todayString(), spoons: null, log: [] };
  }

  function defaults() {
    return {
      version: 1,
      tasks: [],
      day: freshDay(),
      settings: { textSize: 'default', readable: false, contrast: false, theme: 'auto', reduceMotion: false, readAloud: false }
    };
  }

  function normalize(data) {
    var base = defaults();
    if (!data || typeof data !== 'object') return base;
    var state = {
      version: 1,
      tasks: Array.isArray(data.tasks) ? data.tasks.filter(function (t) { return t && t.id && t.title; }) : [],
      day: data.day && data.day.date ? data.day : base.day,
      settings: Object.assign(base.settings, data.settings || {})
    };
    state.tasks.forEach(function (t) {
      t.cost = Math.min(5, Math.max(1, Number(t.cost) || 1));
      t.steps = Array.isArray(t.steps) ? t.steps : [];
    });
    if (!Array.isArray(state.day.log)) state.day.log = [];
    // A new day starts with a fresh energy check-in; yesterday's spending doesn't carry over.
    if (state.day.date !== todayString()) state.day = freshDay();
    return state;
  }

  function load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(KEY)));
    } catch (e) {
      return defaults();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function exportJSON(state) {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    return normalize(JSON.parse(text));
  }

  root.Store = { load: load, save: save, defaults: defaults, exportJSON: exportJSON, importJSON: importJSON, freshDay: freshDay };
})(self);
