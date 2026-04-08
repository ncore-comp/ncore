(function () {
    const MOBILE_BREAKPOINT = 768;
    let lastMode = '';

    function isMobileViewport() {
        return Math.max(window.innerWidth || 0, 0) <= MOBILE_BREAKPOINT;
    }

    function applyViewportMode() {
        const mobile = isMobileViewport();
        const nextMode = mobile ? 'mobile' : 'desktop';
        if (lastMode === nextMode) return;
        const previousMode = lastMode;
        lastMode = nextMode;

        const root = document.documentElement;
        const body = document.body;
        if (root) {
            root.classList.toggle('mobile-layout', mobile);
            root.classList.toggle('desktop-layout', !mobile);
            root.setAttribute('data-layout-mode', nextMode);
        }
        if (body) {
            body.classList.toggle('mobile-layout', mobile);
            body.classList.toggle('desktop-layout', !mobile);
            body.setAttribute('data-layout-mode', nextMode);
        }

        const appRef = (typeof app !== 'undefined') ? app : window.app;
        if (appRef) {
            appRef.isMobileViewport = mobile;
            appRef.mobileViewportWidth = window.innerWidth || 0;
            if (previousMode && previousMode !== nextMode && appRef.currentUser) {
                try {
                    if (typeof appRef.renderNav === 'function') appRef.renderNav();
                    if (appRef.currentView === 'dashboard' && typeof appRef.refreshDashboard === 'function') {
                        appRef.refreshDashboard();
                    } else if (appRef.currentView === 'user-management' && typeof appRef.renderUserManagement === 'function') {
                        appRef.renderUserManagement();
                    } else if (appRef.currentView === 'master-permissions' && typeof appRef.renderMasterPermissionPage === 'function') {
                        appRef.renderMasterPermissionPage();
                    }
                } catch (e) {
                    console.warn('mobile layout rerender skip', e);
                }
            }
        }
    }

    function scheduleApplyViewportMode() {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(applyViewportMode);
            return;
        }
        setTimeout(applyViewportMode, 0);
    }

    function bindViewportEvents() {
        window.addEventListener('resize', scheduleApplyViewportMode, { passive: true });
        window.addEventListener('orientationchange', scheduleApplyViewportMode, { passive: true });
        window.addEventListener('pageshow', scheduleApplyViewportMode, { passive: true });
    }

    function initMobileUiBridge() {
        const appRef = (typeof app !== 'undefined') ? app : window.app;
        if (appRef) {
            appRef.mobile = {
                breakpoint: MOBILE_BREAKPOINT,
                isMobileViewport,
                applyViewportMode: scheduleApplyViewportMode
            };
        }
        applyViewportMode();
        bindViewportEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileUiBridge, { once: true });
    } else {
        initMobileUiBridge();
    }
})();
