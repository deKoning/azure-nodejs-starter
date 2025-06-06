// ===== COMPLETE CONTENTS OF public/js/app-insights.js =====

// REPLACE 'YOUR_CONNECTION_STRING_HERE' with your actual connection string from Azure
(function() {
    var sdkInstance = "appInsightsSDK";
    window[sdkInstance] = "appInsights";
    var aiName = window[sdkInstance],
        aisdk = window[aiName] || function(n) {
            var o = {
                config: n,
                initialize: !0
            },
            t = document,
            e = window,
            i = "script";
            setTimeout(function() {
                var e = t.createElement(i);
                e.src = n.url || "https://js.monitor.azure.com/scripts/b/ai.2.min.js",
                t.getElementsByTagName(i)[0].parentNode.appendChild(e)
            });
            try {
                o.cookie = t.cookie
            } catch (e) {}
            function a(n) {
                o[n] = function() {
                    var e = arguments;
                    o.queue.push(function() {
                        o[n].apply(o, e)
                    })
                }
            }
            o.queue = [], o.version = 2;
            for (var s = ["Event", "PageView", "Exception", "Trace", "DependencyData", "Metric", "PageViewPerformance"]; s.length;)
                a("track" + s.pop());
            var c = "Track", r = "Page";
            a("start" + c + r + "View"), a("stop" + c + r + "View");
            var u = "setAuthenticatedUserContext", p = "clearAuthenticatedUserContext";
            a(u), a(p);
            var l = "ApplicationInsightsAnalytics", f = "withAI";
            return o[f] = function(n, e) {
                return o.queue.push(function() {
                    o.track("start" + l, {
                        name: n,
                        data: e
                    })
                }), {
                    end: function() {
                        o.track("stop" + l, {
                            name: n,
                            data: e
                        })
                    }
                }
            }, o
        }({
            config: {
                connectionString: 'InstrumentationKey=2105187e-4890-4f76-a832-2729c0ccc743;IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;ApplicationId=61d6f45d-dc58-49aa-87d0-6ae2a60547eb'
            }
        });
    window[aiName] = aisdk, aisdk.queue && 0 === aisdk.queue.length && aisdk.trackPageView({});
})();

// Track button clicks
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
        appInsights.trackEvent({
            name: 'ButtonClick',
            properties: {
                elementText: e.target.textContent,
                elementId: e.target.id,
                page: window.location.pathname
            }
        });
    }
});

// Track form submissions
document.addEventListener('submit', function(e) {
    appInsights.trackEvent({
        name: 'FormSubmit',
        properties: {
            formId: e.target.id,
            page: window.location.pathname
        }
    });
});
