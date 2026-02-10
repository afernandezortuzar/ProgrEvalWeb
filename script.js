// 1. Setup RDFLib
window.$rdf = window.$rdf;
window.store = window.$rdf.graph();
window.isOntologyLoaded = false;

// Namespaces based on your server.py and ontology files
const PROGREVAL = window.$rdf.Namespace('urn:protege:ontology:progreval#');
const RDF = window.$rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');

// Configuration
const ONTOLOGY_URL = 'https://raw.githubusercontent.com/afernandezortuzar/ProgrEvalOWL/main/ProgrEval-Ontology.owl';

// 2. Load Ontology
fetch(ONTOLOGY_URL, { mode: 'cors', credentials: 'omit' })
    .then(response => {
        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
        return response.text();
    })
    .then(body => {
        window.$rdf.parse(body, window.store, ONTOLOGY_URL, 'application/rdf+xml');
        window.isOntologyLoaded = true;
        
        // Dispatch event so tabs can react
        window.dispatchEvent(new Event('ontologyLoaded'));
        
    })
    .catch(err => {
        console.error('Error fetching ontology:', err);
        const statusEl = document.getElementById('status');
        if (statusEl) {
        statusEl.textContent = 'Error al cargar la ontología.';
        statusEl.className = "error";
        }
    });
    
// 3. Tab System Logic
const TABS_TO_CACHE = ['query']; // Add 'documentation' here if you want to cache it too
let currentTab = null;

window.loadTab = function(tabName) {
    // Update active button
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `tab-button-${tabName}`) {
            btn.classList.add('active');
        }
    });

    const tabContent = document.getElementById('tab-content');

    // Handle leaving the current tab
    if (currentTab && currentTab !== tabName) {
        const prevTabEl = document.getElementById(`tab-${currentTab}`);
        if (prevTabEl) {
            if (TABS_TO_CACHE.includes(currentTab)) {
                // Cache: just hide the element
                prevTabEl.style.display = 'none';
                // Disable CSS to prevent conflicts
                const prevCss = document.getElementById(`css-${currentTab}`);
                if (prevCss) prevCss.disabled = true;
            } else {
                // No Cache: remove from DOM
                prevTabEl.remove();
                // Remove resources
                const prevCss = document.getElementById(`css-${currentTab}`);
                if (prevCss) prevCss.remove();
                const prevJs = document.getElementById(`js-${currentTab}`);
                if (prevJs) prevJs.remove();
            }
        }
    }

    currentTab = tabName;
    const tabId = `tab-${tabName}`;
    let tabEl = document.getElementById(tabId);

    if (tabEl) {
        // Tab exists in cache, just show it
        tabEl.style.display = 'block';
        const cssLink = document.getElementById(`css-${tabName}`);
        if (cssLink) cssLink.disabled = false;
    } else {
        // Load new tab
        fetch(`tabs/${tabName}/${tabName}.html`)
            .then(response => response.text())
            .then(html => {
                const wrapper = document.createElement('div');
                wrapper.id = tabId;
                wrapper.innerHTML = html;
                tabContent.appendChild(wrapper);
                
                // Load CSS
                let cssId = `css-${tabName}`;
                let link = document.getElementById(cssId);
                if (!link) {
                    link = document.createElement('link');
                    link.id = cssId;
                    link.rel = 'stylesheet';
                    link.href = `tabs/${tabName}/${tabName}.css`;
                    document.head.appendChild(link);
                } else {
                    link.disabled = false;
                }

                // Load JS
                let jsId = `js-${tabName}`;
                let script = document.getElementById(jsId);
                if (script) script.remove();
                
                script = document.createElement('script');
                script.id = jsId;
                script.src = `tabs/${tabName}/${tabName}.js`;
                document.body.appendChild(script);
            });
    }
}

// Load default tab
loadTab('query');