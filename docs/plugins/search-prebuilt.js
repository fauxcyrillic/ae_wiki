'use strict';

(function () {
  var INDEXS = {};
  var LOADING = false;
  var LOADED = false;

  function loadIndex(callback) {
    if (LOADED) return callback();
    if (LOADING) return;
    LOADING = true;

    var cached = localStorage.getItem('docsify.search.prebuilt');
    if (cached) {
      try {
        INDEXS = JSON.parse(cached);
        LOADED = true;
        LOADING = false;
        return callback();
      } catch (e) { /* fall through to fetch */ }
    }

    fetch('search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        INDEXS = data;
        LOADED = true;
        LOADING = false;
        try { localStorage.setItem('docsify.search.prebuilt', JSON.stringify(data)); } catch (e) {}
        callback();
      })
      .catch(function () { LOADING = false; });
  }

  function search(keywords) {
    if (!keywords || !keywords.trim()) return [];
    var terms = keywords.toLowerCase().split(/\s+/);
    var results = [];

    Object.keys(INDEXS).forEach(function (page) {
      var sections = INDEXS[page];
      Object.keys(sections).forEach(function (key) {
        var section = sections[key];
        var haystack = ((section.title || '') + ' ' + (section.body || '')).toLowerCase();
        var matches = terms.every(function (t) { return haystack.indexOf(t) !== -1; });
        if (matches) {
          var bodyLower = (section.body || '').toLowerCase();
          var firstTermIdx = bodyLower.indexOf(terms[0]);
          var snippetStart = Math.max(0, firstTermIdx - 40);
          var snippet = (section.body || '').substring(snippetStart, snippetStart + 120);
          if (snippetStart > 0) snippet = '...' + snippet;
          if (snippetStart + 120 < (section.body || '').length) snippet = snippet + '...';

          results.push({
            title: section.title,
            slug: section.slug,
            body: snippet,
          });
        }
      });
    });
    return results;
  }

  function renderResults(results, panel) {
    if (!results.length) {
      panel.innerHTML = '<p class="empty">' + (window.$docsify.search.noData || 'No results') + '</p>';
      return;
    }
    var html = '';
    results.forEach(function (r) {
      html += '<div class="matching-post">'
        + '<a href="' + r.slug + '">'
        + '<h2>' + escapeHtml(r.title) + '</h2>'
        + '<p>' + escapeHtml(r.body) + '</p>'
        + '</a></div>';
    });
    panel.innerHTML = html;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
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
