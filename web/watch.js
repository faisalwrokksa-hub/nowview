'use strict';
/* Discover: preserve existing News, Media and Social controllers. */
(function () {
  function install() {
    const media = document.querySelector('[data-workspace="media"]');
    const news = document.querySelector('[data-workspace="news"]');
    const social = document.querySelector('[data-workspace="social"]');
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
      { id: 'headlines', label: 'Headlines', panel: news },
      { id: 'channels', label: 'Live TV', panel: channelPanel },
      { id: 'videos', label: 'Videos', panel: videoPanel }
    ];
    if(social)sections.push({id:'social',label:'Social',panel:social});
    if(social){social.removeAttribute('data-workspace');social.classList.remove('shell-page');social.id='nv-watch-social';media.appendChild(social);}
    news.removeAttribute('data-workspace');
    news.classList.remove('shell-page');
    news.id = 'nv-watch-headlines';
    media.appendChild(news);
    media.insertBefore(tabs, media.firstChild);

    let active = 'headlines';
    function select(id) {
      if (!sections.some(section => section.id === id)) return false;
      if (id !== active) window.NewViewMedia?.stopPlayback?.();
      const previousFocus=document.activeElement;
      const focusInsideHiddenPanel=sections.some(section=>section.id!==id&&section.panel.contains(previousFocus));
      active = id;
      for (const section of sections) {
        section.panel.hidden = section.id !== id;
        section.button?.setAttribute('aria-pressed', String(section.id === id));
      }
      if(focusInsideHiddenPanel){const target=sections.find(section=>section.id===id)?.button;if(target){try{target.focus({preventScroll:true});}catch{target.focus();}}}
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
        ? 'nv-watch-headlines' : (section.id === 'channels' ? 'nv-watch-channels' : section.id==='social'?'nv-watch-social':'nv-watch-videos'));
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click', () => select(section.id));
      button.addEventListener('keydown', event => {
        const index = sections.findIndex(item => item.id === section.id);
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % sections.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + sections.length - 1) % sections.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = sections.length - 1;
        else return;
        event.preventDefault();
        select(sections[next].id);
        sections[next].button?.focus();
      });
      section.button = button;
      tabs.appendChild(button);
    }
    channelPanel.id = 'nv-watch-channels';
    videoPanel.id = 'nv-watch-videos';
    window.NewViewWatch = { select, currentSection: () => active };
    select('headlines');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else install();
})();
