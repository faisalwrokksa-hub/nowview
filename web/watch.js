'use strict';
/* Five-workspace Watch & News: retain existing News and Media controllers. */
(function () {
  function install() {
    const media = document.querySelector('[data-workspace="media"]');
    const news = document.querySelector('[data-workspace="news"]');
    if (!media || !news || document.getElementById('nv-watch-sections')) return;
    const channelPanel = media.querySelector('.shell-card');
    const videoPanel = media.querySelector('.shell-grid');
    if (!channelPanel || !videoPanel) return;

    // Keep the existing publisher and player DOM nodes intact so their
    // already-installed event handlers, request cancellation and states survive.
    const tabs = document.createElement('nav');
    tabs.id = 'nv-watch-sections';
    tabs.className = 'nv-watch-sections';
    tabs.setAttribute('aria-label', 'Watch & News sections');
    const sections = [
      { id: 'channels', label: 'Live TV', panel: channelPanel },
      { id: 'videos', label: 'Videos', panel: videoPanel },
      { id: 'headlines', label: 'Headlines', panel: news }
    ];
    news.removeAttribute('data-workspace');
    news.classList.remove('shell-page');
    news.id = 'nv-watch-headlines';
    media.appendChild(news);
    media.insertBefore(tabs, media.firstChild);

    let active = 'channels';
    function select(id) {
      if (!sections.some(section => section.id === id)) return false;
      const previousFocus=document.activeElement;
      const focusInsideHiddenPanel=sections.some(section=>section.id!==id&&section.panel.contains(previousFocus));
      active = id;
      for (const section of sections) {
        section.panel.hidden = section.id !== id;
        section.button?.setAttribute('aria-pressed', String(section.id === id));
        if(section.button)section.button.tabIndex=section.id===id?0:-1;
      }
      if(focusInsideHiddenPanel){const target=sections.find(section=>section.id===id)?.button;try{target?.focus({preventScroll:true});}catch{target?.focus();}}
      if (id === 'headlines' && !document.getElementById('news-items')?.children.length) {
        document.getElementById('news-refresh')?.click();
      }
      return true;
    }
    for (const section of sections) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.watchSection = section.id;
      button.textContent = section.label;
      button.setAttribute('aria-controls', section.id === 'headlines'
        ? 'nv-watch-headlines' : (section.id === 'channels' ? 'nv-watch-channels' : 'nv-watch-videos'));
      button.addEventListener('click', () => select(section.id));
      section.button = button;
      tabs.appendChild(button);
    }
    channelPanel.id = 'nv-watch-channels';
    videoPanel.id = 'nv-watch-videos';
    window.NewViewWatch = { select, currentSection: () => active };
    select('channels');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else install();
})();
