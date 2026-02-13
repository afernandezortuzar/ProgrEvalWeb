(function() {
    // DOM Elements
    const submitBtn = document.getElementById('btn-submit-design');
    
    // SPARQL Queries Configuration
    // Fill these strings with your SPARQL queries.
    // Ensure the query returns a single column with the values you want to list.
    const QUERIES = {
        concepto: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX progreval: <urn:protege:ontology:progreval#>

        SELECT ?Label ?Instance ?Description
        WHERE {
            ?Instance a progreval:Concepto-Fundamental.
            ?Instance rdfs:label ?Label.
            OPTIONAL { ?Instance dc:description ?Description. } 
        }`,
        desempeno: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX progreval: <urn:protege:ontology:progreval#>

        SELECT ?Label ?Instance ?Description
        WHERE {
            ?Instance a progreval:Desempeño.
            ?Instance rdfs:label ?Label.
            OPTIONAL { ?Instance dc:description ?Description. }
        }`,
        nivel: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX progreval: <urn:protege:ontology:progreval#>

        SELECT ?Label ?Instance ?Description
        WHERE {
            ?Instance a progreval:Publico-Objetivo.
            ?Instance rdfs:label ?Label.
            OPTIONAL { ?Instance dc:description ?Description. }
        }`
    };

    /**
     * Executes a SPARQL query and returns the results.
     * @param {string} queryString 
     * @returns {Promise<Array>}
     */
    const executeSparql = (queryString) => {
        return new Promise((resolve, reject) => {
            if (!queryString || queryString.trim() === '') {
                resolve([]); // Return empty if query is not defined yet
                return;
            }
            try {
                // Add prefixes if needed, or assume they are in the query or not needed for simple selects if full URIs are used
                // For safety, we can prepend standard prefixes if they are missing, 
                // but here we rely on the user providing a valid query or the global store handling it.
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
     * Fetches data for a specific key and parses it into a standard format.
     * @param {string} queryKey The key in QUERIES object
     * @returns {Promise<Array<{label: string, value: string, description: string}>>}
     */
    const fetchData = async (queryKey) => {
        try {
            const queryString = QUERIES[queryKey];
            if (!queryString) return [];

            const results = await executeSparql(queryString);
            
            return results.map(row => {
                if (!row['?Label'] || !row['?Instance']) return null;

                return {
                    label: row['?Label'].value,
                    value: row['?Instance'].value.split('#').pop(), // Local name
                    description: row['?Description'] ? row['?Description'].value : ''
                };
            }).filter(item => item !== null);
        } catch (err) {
            console.error(`Error loading ${queryKey}:`, err);
            return [];
        }
    };

    /**
     * Populates a <select> element with the provided data.
     */
    const renderSelect = (selectId, data) => {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        if (data.length === 0) {
            const option = document.createElement('option');
            option.text = "No se encontraron datos";
            select.add(option);
            select.disabled = true;
        } else {
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.value;
                option.text = item.label;
                select.appendChild(option);
            });
            select.disabled = false;
        }
    };

    /**
     * Builds the "Conocimientos previos" grid.
     */
    const renderGrid = (conceptos, desempenos) => {
        const container = document.getElementById('knowledge-grid-container');
        if (!container) return;

        if (conceptos.length === 0 || desempenos.length === 0) {
            container.innerHTML = '<p>No hay datos suficientes para generar la tabla.</p>';
            return;
        }

        let html = '<table class="design-grid"><thead><tr><th></th>';
        
        // Header Row (Conceptos)
        conceptos.forEach((c, index) => {
            html += `<th>
                <div class="header-content">
                    <div class="header-label-container">
                        <div class="header-label">${c.label}</div>
                        <div title="${c.description.replace(/"/g, '&quot;')}" class="info-icon">ℹ️</div>                    
                    </div>
                    <input type="checkbox" class="select-all-col" data-col="${index}" title="Seleccionar todo">
                </div>
            </th>`;
        });
        html += '</tr></thead><tbody>';

        // Body Rows (Desempeños)
        desempenos.forEach(d => {
            html += `<tr><th>${d.label}</th>`;
            conceptos.forEach((c, index) => {
                // Checkbox value combines Desempeño and Concepto IDs
                const val = `${d.value}|${c.value}`;
                html += `<td><input type="checkbox" name="conocimiento_previo" value="${val}" data-col="${index}"></td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;

        // Event delegation for Select All
        container.onchange = (e) => {
            if (e.target.classList.contains('select-all-col')) {
                const colIndex = e.target.dataset.col;
                const isChecked = e.target.checked;
                const checkboxes = container.querySelectorAll(`input[name="conocimiento_previo"][data-col="${colIndex}"]`);
                checkboxes.forEach(cb => cb.checked = isChecked);
            } else if (e.target.name === 'conocimiento_previo') {
                const colIndex = e.target.dataset.col;
                const selectAllCb = container.querySelector(`.select-all-col[data-col="${colIndex}"]`);
                const colCheckboxes = container.querySelectorAll(`input[name="conocimiento_previo"][data-col="${colIndex}"]`);
                
                if (selectAllCb) {
                    selectAllCb.checked = Array.from(colCheckboxes).every(cb => cb.checked);
                }
            }
        };
    };

    const init = async () => {
        // Fetch all data first
        const [conceptos, desempenos, niveles] = await Promise.all([
            fetchData('concepto'),
            fetchData('desempeno'),
            fetchData('nivel')
        ]);

        // Render Dropdowns
        renderSelect('select-concepto', conceptos);
        renderSelect('select-desempeno', desempenos);
        renderSelect('select-nivel', niveles);

        // Render Grid
        renderGrid(conceptos, desempenos);
    };

    // Check if ontology is loaded
    if (window.isOntologyLoaded) {
        init();
    } else {
        window.addEventListener('ontologyLoaded', init, { once: true });
    }

    // Placeholder submit action
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            alert('Acción de envío pendiente de implementación.');
        });
    }
})();