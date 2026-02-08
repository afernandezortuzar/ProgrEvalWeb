// 1. Setup RDFLib
const $rdf = window.$rdf;
const store = $rdf.graph();

// Namespaces based on your server.py and ontology files
const PROGREVAL = $rdf.Namespace('urn:protege:ontology:progreval#');
const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');

// Configuration
const ONTOLOGY_URL = 'https://raw.githubusercontent.com/afernandezortuzar/ProgrEvalOWL/main/ProgrEval-Ontology.owl';

// DOM Elements
const statusEl = document.getElementById('status');
const queryInput = document.getElementById('queryInput');
const runQueryBtn = document.getElementById('runQueryBtn');
const resultsDiv = document.getElementById('results');

// 2. Load Ontology
fetch(ONTOLOGY_URL, { mode: 'cors', credentials: 'omit' })
    .then(response => {
        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
        return response.text();
    })
    .then(body => {
        $rdf.parse(body, store, ONTOLOGY_URL, 'application/rdf+xml');
        statusEl.textContent = 'Ontología cargada correctamente.';
        initializeInterface();
    })
    .catch(err => {
        console.error('Error fetching ontology:', err);
        statusEl.textContent = 'Error al cargar la ontología.';
        statusEl.className = "error";
    });
    
// 3. Interface Logic
function initializeInterface() {
    queryInput.disabled = false;
    runQueryBtn.disabled = false;
    runQueryBtn.addEventListener('click', executeQuery);
}

function executeQuery() {
    let queryString = queryInput.value;

    // Remove lines starting with # (including the newline) to avoid parsing issues
    queryString = queryString.replace(/^\s*#.*(\r\n|\n|\r)?/gm, '');

    // Extract LIMIT and ORDER BY RAND manually because rdflib.js ignores them
    const limitMatch = queryString.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 0;
    const isRandom = /ORDER\s+BY\s+RAND/i.test(queryString);

    // Prepend prefixes if not explicitly present
    if (queryString.search(/PREFIX/i) === -1) {
        queryString = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX progreval: <urn:protege:ontology:progreval#>
` + queryString;
    }

    resultsDiv.innerHTML = '<div class="status">Ejecutando consulta...</div>';
    
    try {
        // Convert string to query object
        const query = $rdf.SPARQLToQuery(queryString, false, store);
        const results = [];
        
        // Execute query
        store.query(query, result => {
            // Callback for each row found
            results.push(result);
        }, undefined, () => {
            // Callback when finished
            let finalResults = results;

            // Apply manual shuffle if requested
            if (isRandom) {
                finalResults.sort(() => Math.random() - 0.5);
            }

            // Apply manual limit if requested
            if (limit > 0 && finalResults.length > limit) {
                finalResults = finalResults.slice(0, limit);
            }
            renderResults(finalResults, query.vars);
        });
    } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = '<div class="error">Error en la consulta: ' + err.message + '</div>';
    }
}

function renderResults(results, vars) {
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="status">No se encontraron resultados.</div>';
        return;
    }

    // Determine headers
    let headers = [];
    if (vars && vars.length > 0) {
        headers = vars.map(v => v.toString());
    } else {
        for (let key in results[0]) {
            if (results[0].hasOwnProperty(key)) headers.push(key);
        }
    }

    let html = '';

    results.forEach((row, index) => {
        html += `<div class="result-row">`;
        html += `<h3 class="row-header">Ejemplo ${index + 1}</h3>`;
        
        headers.forEach(h => {
            const val = row[h];
            let display = '';
            if (val) {
                // If it's a NamedNode (URI), make it a link and show short name
                if (val.termType === 'NamedNode') {
                    const label = val.value.split('#').pop() || val.value;
                    display = `<a href="${val.value}" title="${val.value}" target="_blank">${label}</a>`;
                } else {
                    // Escape HTML characters for security
                    display = val.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                }
            }
            html += `<div class="data-pair">`;
            html += `<span class="data-label">${h.replace('?', '')}:</span>`;
            html += `<div class="data-value">${display}</div>`;
            html += `</div>`;
        });
        html += `</div>`;
    });

    resultsDiv.innerHTML = html;
}