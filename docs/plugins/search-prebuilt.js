'use strict';

(function () {
  var CACHE_KEY = 'docsify.search.v2';
  var index = null;
  var loading = false;

  function clearOldCaches() {
    try {
      localStorage.removeItem('docsify.search.index');
      localStorage.removeItem('docsify.search.prebuilt');
      localStorage.removeItem('docsify.search.expires');
    } catch (e) {}
  }

  function loadIndex(callback) {
    if (index) return callback();
    if (loading) return;
    loading = true;

    clearOldCaches();

    var cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          index = parsed;
          loading = false;
          return callback();
        }
      } catch (e) { /* fall through to fetch */ }
    }

    fetch('search-index.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        index = data;
        loading = false;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
        callback();
      })
      .catch(function () { loading = false; });
  }

  function search(query) {
    if (!query || !query.trim()) return [];
    var terms = query.toLowerCase().split(/\s+/);
    var results = [];

    for (var i = 0; i < index.length; i++) {
      var page = index[i];
      var haystack = (page.title + ' ' + page.body).toLowerCase();
      var matches = true;
      for (var t = 0; t < terms.length; t++) {
        if (haystack.indexOf(terms[t]) === -1) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(page);
      }
    }

    return results;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderResults(results, panel) {
    if (!results.length) {
      var msg = (window.$docsify.search && window.$docsify.search.noData) || 'No results';
      panel.innerHTML = '<p class="empty">' + msg + '</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < results.length; i++) {
      html += '<div class="matching-post">'
        + '<a href="' + results[i].url + '">'
        + '<h2>' + escapeHtml(results[i].title) + '</h2>'
        + '</a></div>';
    }
    panel.innerHTML = html;
  }

  function createSearchUI(hook) {
    hook.mounted(function () {
      var sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;

      var searchDiv = document.createElement('div');
      searchDiv.className = 'search';
      searchDiv.setAttribute('role', 'search');

      var inputWrap = document.createElement('div');
      inputWrap.className = 'input-wrap';

      var input = document.createElement('input');
      input.type = 'search';
      input.placeholder = (window.$docsify.search && window.$docsify.search.placeholder) || 'Search';
      input.setAttribute('aria-label', 'Search');

      var resultsPanel = document.createElement('div');
      resultsPanel.className = 'results-panel';

      inputWrap.appendChild(input);
      searchDiv.appendChild(inputWrap);
      searchDiv.appendChild(resultsPanel);

      var sidebarNav = sidebar.querySelector('.sidebar-nav');
      if (sidebarNav) {
        sidebar.insertBefore(searchDiv, sidebarNav);
      } else {
        sidebar.insertBefore(searchDiv, sidebar.firstChild);
      }

      var debounceTimer;
      input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        var val = input.value;
        debounceTimer = setTimeout(function () {
          if (!val.trim()) {
            resultsPanel.innerHTML = '';
            resultsPanel.classList.remove('show');
            return;
          }
          loadIndex(function () {
            var results = search(val);
            renderResults(results, resultsPanel);
            resultsPanel.classList.add('show');
          });
        }, 200);
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          input.value = '';
          resultsPanel.innerHTML = '';
          resultsPanel.classList.remove('show');
        }
      });

      resultsPanel.addEventListener('click', function () {
        input.value = '';
        resultsPanel.innerHTML = '';
        resultsPanel.classList.remove('show');
      });
    });
  }

  if (window.$docsify) {
    window.$docsify.plugins = [].concat(createSearchUI, window.$docsify.plugins || []);
  }
})();
