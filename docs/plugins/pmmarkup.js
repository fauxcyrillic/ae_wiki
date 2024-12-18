'use strict';

// Docsify plugin functions
function plugin(hook, vm) {
    hook.beforeEach(function (content) {
        // Replace PmWiki markup with corresponding HTML and Markdown

        content = content.replace(/'''''(.*?)'''''/g, function (match, p1) {
            return `__**${p1}**__`;
        });

        content = content.replace(/'''(?:\s*)(.*?)(?:\s*)'''/g, function (match, p1) {
            return `**${p1}**`;
        });

        content = content.replace(/''(?:\s*)(.*?)(?:\s*)''/g, function (match, p1) {
            return `__${p1}__`;
        });

        content = content.replace(/@@(.*?)@@/g, function (match, p1) {
            return `\`${p1}\``;
        });

        content = content.replace(/!!!!\s*(.*?)(\n|$)/g, function (match, p1) {
            return `### ${p1}\n`;
        });

        content = content.replace(/!!!\s*(.*?)(\n|$)/g, function (match, p1) {
            return `## ${p1}\n`;
        });

        content = content.replace(/!!\s*(.*?)(\n|$)/g, function (match, p1) {
            return `# ${p1}\n`;
        });
        return content;
    });

    hook.afterEach(function (html, next) {
        html = html.replace(/%embed%\s*<a.*?href="(https:\/\/youtu\.be\/|https:\/\/www\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)".*?>.*?<\/a>\s*%%/g, function (match, baseUrl, videoId) {
            return `
            <div class="video">
              <iframe
                height=350px
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
              </iframe>
            </div>
            `;
        });

        next(html);
    });
}

if (typeof window !== "undefined") {
  if (!window.$docsify) {
      console.error('no docsify');
  } else {
      window.$docsify.plugins = [].concat(plugin, window.$docsify.plugins);
  }
} else {
  module.exports = {plugin}
}

