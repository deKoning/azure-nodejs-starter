// Fixed public/js/app-insights.js

(function() {
    var sdkInstance = "appInsightsSDK";
    window[sdkInstance] = "appInsights";
    var aiName = window[sdkInstance];
    
    var aisdk = window[aiName] || function(config) {
        var i = config;
        var t = document;
        var e = window;
        var o = "script";
        
        // Create script element
        var s = t.createElement(o);
        s.src = "https://js.monitor.azure.com/scripts/b/ai.2.min.js";
        
        var n = t.getElementsByTagName(o)[0];
        n.parentNode.insertBefore(s, n);
        
        var r = {
            config: i,
            queue: [],
            version: 2
        };
        
        // Add tracking methods
        var methods = ["Event", "PageView", "Exception", "Trace", "DependencyData", "Metric"];
        for (var a = 0; a < methods.length; a++) {
            r["track" + methods[a]] = (function(method) {
                return function() {
                    var args = arguments;
                    r.queue.push(function() {
                        r["track" + method].apply(r, args);
                    });
                };
            })(methods[a]);
        }
        
        return r;
    }({
        // Use your correct connection string here
        connectionString: "InstrumentationKey=2105187e-4890-4f76-a832-2729c0ccc743;IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;ApplicationId=61d6f45d-dc58-49aa-87d0-6ae2a60547eb"
    });
    
    window[aiName] = aisdk;
    
    // Track initial page view
    aisdk.trackPageView();
    
    // Track button clicks
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
            aisdk.trackEvent({
                name: 'ButtonClick',
                properties: {
                    elementText: e.target.textContent || e.target.innerText,
                    elementId: e.target.id,
                    page: window.location.pathname
                }
            });
        }
    });
    
    // Track form submissions
    document.addEventListener('submit', function(e) {
        aisdk.trackEvent({
            name: 'FormSubmit',
            properties: {
                formId: e.target.id,
                page: window.location.pathname
            }
        });
    });
    
})();
