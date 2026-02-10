(function() {    
    const container = document.getElementById('doc-container');
    

    // Event Delegation for Accordion Toggles
    container.addEventListener('click', function(e) {
        // Check if clicked element is a header
        if (e.target.classList.contains('accordion-header')) {
            const header = e.target;
            const content = header.nextElementSibling;
            const parentId = header.parentElement.id;

            // Check current visibility
            const isExpanded = content.style.display === 'block';
            
            // Close all siblings (optional, but keeps UI clean)
            const allContents = header.parentElement.parentElement.querySelectorAll(':scope > .accordion-item > .accordion-content');
            allContents.forEach(c => c.style.display = 'none');

            // Toggle current
            header.classList.toggle('active');
            content.style.display = isExpanded ? 'none' : 'block';

            // Lazy Load Logic
            if (!isExpanded) {
                if (parentId === 'panel-conceptos') {
                    loadConceptos(content);
                } else if (parentId === 'panel-desempenos') {
                    loadDesempenos(content);
                } else if (parentId === 'panel-formatos') {
                    loadFormatos(content);
                }
            }
        }
    });

    /**
     * Helper to execute SPARQL queries using a Promise wrapper
     * @param {string} queryString 
     * @returns {Promise<Array>}
     */
    const executeSparql = (queryString) => {
        return new Promise((resolve, reject) => {
            try {
                const query = window.$rdf.SPARQLToQuery(queryString, false, window.store);
                const results = [];
                window.store.query(query, 
                    result => results.push(result), 
                    undefined, 
                    () => resolve(results)
                );
            } catch (err) {
                reject(err);
            }
        });
    };

    /**
     * Loads the "Conceptos Fundamentales" from the ontology
     * @param {HTMLElement} contentDiv 
     */
    const loadConceptos = async (contentDiv) => {
        // Check if already loaded
        if (contentDiv.dataset.loaded === 'true') return;

        const queryString = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX progreval: <urn:protege:ontology:progreval#>

        SELECT ?Concepto ?Descripcion
        WHERE {
            ?Concepto a progreval:Concepto-Fundamental.
            ?Concepto dc:description ?Descripcion. 
        }`;

        await loadData(contentDiv, queryString, '?Concepto', '?Descripcion');
    };

    /**
     * Loads the "Desempeños" from the ontology
     * @param {HTMLElement} contentDiv 
     */
    const loadDesempenos = async (contentDiv) => {
        // Check if already loaded
        if (contentDiv.dataset.loaded === 'true') return;

        const queryString = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX progreval: <urn:protege:ontology:progreval#>

        SELECT ?Desempeno ?Descripcion
        WHERE {
            ?Desempeno a progreval:Desempeño.
            ?Desempeno dc:description ?Descripcion. 
        }`;

        await loadData(contentDiv, queryString, '?Desempeno', '?Descripcion');
    };

    /**
     * Loads the "Formatos de actividad" from the ontology
     * @param {HTMLElement} contentDiv 
     */
    const loadFormatos = async (contentDiv) => {
        // Check if already loaded
        if (contentDiv.dataset.loaded === 'true') return;

        const queryString = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX progreval: <urn:protege:ontology:progreval#>

        SELECT ?Formato ?Descripcion
        WHERE {
            ?Formato a progreval:Formato-Actividad.
            ?Formato dc:description ?Descripcion. 
        }`;

        await loadData(contentDiv, queryString, '?Formato', '?Descripcion');
    };

    /**
     * Generic data loader
     */
    const loadData = async (contentDiv, queryString, titleVar, descVar) => {
        // If ontology is not loaded, wait for it.
        if (!window.isOntologyLoaded) {
            contentDiv.innerHTML = '<div class="status-msg">Esperando a que la ontología cargue...</div>';
            window.addEventListener('ontologyLoaded', () => {
                loadData(contentDiv, queryString, titleVar, descVar);
            }, { once: true });
            return;
        }

        contentDiv.innerHTML = '<div class="status-msg">Cargando...</div>';

        try {
            const results = await executeSparql(queryString);
            renderNestedPanels(contentDiv, results, titleVar, descVar);
        } catch (err) {
            console.error(err);
            contentDiv.innerHTML = `<div class="error">Error en la consulta: ${err.message}</div>`;
        }
    };

    /**
     * Renders the SPARQL results as nested accordion items
     * @param {HTMLElement} container 
     * @param {Array} results 
     * @param {string} titleVar
     * @param {string} descVar
     */
    const renderNestedPanels = (container, results, titleVar, descVar) => {
        if (results.length === 0) {
            container.innerHTML = '<div class="status-msg">No se encontraron resultados.</div>';
            return;
        }

        let html = '';
        
        results.forEach(row => {
            // Extract Title
            let title = 'Sin título';
            if (row[titleVar]) {
                const val = row[titleVar].value;
                // Get local name (after #)
                title = val.split('#').pop() || val;
                // Replace hyphens with spaces for better readability
                title = title.replace(/-/g, ' ');
            }

            // Extract Description
            let description = 'Sin descripción';
            if (row[descVar]) {
                description = row[descVar].value;
            }

            html += `
            <div class="accordion-item">
                <button class="accordion-header">${title}</button>
                <div class="accordion-content plain-text"><p>${description}</p></div>
            </div>`;
        });

        container.innerHTML = html;
        container.dataset.loaded = 'true';
    };
})();
