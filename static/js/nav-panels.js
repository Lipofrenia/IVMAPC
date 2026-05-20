(function () {
    var header = document.querySelector('.site-header');
    var flyout = document.getElementById('nav-flyout');
    var menuButton = document.querySelector('.menu-button');
    var navLinks = document.getElementById('nav-links');
    if (!header || !flyout) return;

    var triggers = document.querySelectorAll('.nav-flyout-trigger');
    var panels = {
        company: document.getElementById('nav-content-company'),
        contacts: document.getElementById('nav-content-contacts')
    };

    var openPanel = null;

    function setTriggerExpanded(activeName) {
        triggers.forEach(function (btn) {
            var n = btn.getAttribute('data-nav-panel');
            var on = activeName && n === activeName;
            btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
    }

    function showPanel(name) {
        if (!panels.company || !panels.contacts) return;
        if (name === 'company') {
            panels.company.removeAttribute('hidden');
            panels.contacts.setAttribute('hidden', '');
        } else if (name === 'contacts') {
            panels.contacts.removeAttribute('hidden');
            panels.company.setAttribute('hidden', '');
        }
    }

    function hidePanels() {
        if (panels.company) panels.company.setAttribute('hidden', '');
        if (panels.contacts) panels.contacts.setAttribute('hidden', '');
    }

    function closeFlyout() {
        flyout.classList.remove('is-open');
        openPanel = null;
        setTriggerExpanded(null);
        hidePanels();
    }

    function openFlyoutWith(name) {
        showPanel(name);
        flyout.classList.add('is-open');
        openPanel = name;
        setTriggerExpanded(name);
        if (menuButton) {
            document.body.classList.remove('nav-menu-open');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    }

    function toggle(name) {
        if (openPanel === name) {
            closeFlyout();
            return;
        }
        openFlyoutWith(name);
    }

    triggers.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var name = btn.getAttribute('data-nav-panel');
            if (name) toggle(name);
        });
    });

    if (navLinks) {
        var navAnchors = navLinks.querySelectorAll('a[href]');
        navAnchors.forEach(function (a) {
            a.addEventListener('click', function () {
                closeFlyout();
            });
        });
    }

    if (menuButton) {
        menuButton.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = !document.body.classList.contains('nav-menu-open');
            document.body.classList.toggle('nav-menu-open', isOpen);
            menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (isOpen) {
                closeFlyout();
            }
        });
    }

    document.addEventListener('click', function (e) {
        if (openPanel && !header.contains(e.target)) {
            closeFlyout();
        }
        if (document.body.classList.contains('nav-menu-open') && menuButton && navLinks) {
            if (menuButton.contains(e.target) || navLinks.contains(e.target)) {
                return;
            }
            document.body.classList.remove('nav-menu-open');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (openPanel) {
            closeFlyout();
        }
        if (document.body.classList.contains('nav-menu-open') && menuButton) {
            document.body.classList.remove('nav-menu-open');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    });
})();
