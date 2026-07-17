/**
 * <civic-sidebar> — Left sidebar navigation
 * Attributes: active-route
 */

export class CivicSidebar extends HTMLElement {
  static observedAttributes = ['active-route'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.updateActive(); }

  private updateActive() {
    const active = this.getAttribute('active-route') || 'dashboard';
    this.querySelectorAll<HTMLElement>('.nav-link[data-route]').forEach(link => {
      link.classList.toggle('active', link.dataset.route === active);
    });
  }

  private render() {
    this.id = 'sidebar';
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Main navigation');
    this.innerHTML = `
      <ul class="nav-links" role="list">
        <li><a href="#/dashboard" class="nav-link" data-route="dashboard">
          <span class="material-icons-round">home</span><span>Dashboard</span></a></li>
        <li><a href="#/study-launch" class="nav-link" data-route="study">
          <span class="material-icons-round">style</span><span>Study</span></a></li>
        <li><a href="#/library" class="nav-link" data-route="library">
          <span class="material-icons-round">library_books</span><span>Library</span></a></li>
        <li><a href="#/stats" class="nav-link" data-route="stats">
          <span class="material-icons-round">bar_chart</span><span>Stats</span></a></li>
        <li><a href="#/settings" class="nav-link" data-route="settings">
          <span class="material-icons-round">settings</span><span>Settings</span></a></li>
      </ul>
      <div class="sidebar-motto">
        <span class="sidebar-motto-stars">★ ★ ★</span>
        E pluribus unum
      </div>
    `;

    this.updateActive();

    // Mobile nav: close on link click
    this.querySelectorAll('.nav-link[data-route]').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.classList.remove('open');
          document.querySelector('.sidebar-overlay')?.classList.remove('visible');
          const toggle = document.querySelector('.mobile-nav-toggle');
          if (toggle) toggle.innerHTML = '<span class="material-icons-round">menu</span>';
        }
      });
    });
  }
}

customElements.define('civic-sidebar', CivicSidebar);
