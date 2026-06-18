/**
 * storage.js - Local Storage management for Admin Panel.
 * Stores menu metadata only. Image bytes must never be persisted here.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "restaurant-menu-admin";
  var BASELINE_KEY = "restaurant-menu-imported";

  function saveMenuData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Failed to save menu data:", e);
      return false;
    }
  }

  function loadMenuData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to load menu data:", e);
      return null;
    }
  }

  function saveBaseline(data) {
    try {
      localStorage.setItem(BASELINE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Failed to save baseline:", e);
      return false;
    }
  }

  function loadBaseline() {
    try {
      var raw = localStorage.getItem(BASELINE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BASELINE_KEY);
  }

  global.MenuStorage = {
    saveMenuData: saveMenuData,
    loadMenuData: loadMenuData,
    saveBaseline: saveBaseline,
    loadBaseline: loadBaseline,
    clearAll: clearAll,
  };
})(window);
