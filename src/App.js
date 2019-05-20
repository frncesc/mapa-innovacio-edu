import React, { Component } from 'react';
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import CheckRouteChanges from './utils/CheckRouteChanges';

import CssBaseline from '@material-ui/core/CssBaseline';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import { createMuiTheme } from '@material-ui/core/styles';
import color_error from '@material-ui/core/colors/red';
import Fuse from 'fuse.js';

import Utils from './utils/Utils';
import Header from './components/Header';
import Presentacio from './components/Presentacio';
import Programes from './components/Programes';
import FitxaPrograma from './components/FitxaPrograma';
import FitxaCentre from './components/FitxaCentre';
import FitxaZona from './components/FitxaZona';
import Error from './components/Error';
import Loading from './components/Loading';
import Footer from './components/Footer';
import Cerca from './components/Cerca';
import AppContext, { DEFAULT_STATE } from './AppContext';

// Gencat dark gray
const color_primary = { 500: '#333' };

// Gencat red
const color_secondary = { 500: '#c00000' };

/**
 * Miscellanous values taken from environment variables
 * and from files: `.env`, `.env.development` and `.env.production`
 */
//const API_ROOT = process.env.REACT_APP_API_ROOT || '../api';
const MAX_DENSITY = process.env.REACT_APP_MAX_DENSITY || 0.8;
const MIN_DENSITY = process.env.REACT_APP_MIN_DENSITY || 0.000001;
const MINMAX_DENSITY = process.env.REACT_APP_MINMAX_DENSITY || 0.4;
const DEBUG_GLOBAL_VAR = process.env.REACT_APP_DEBUG_GLOBAL_VAR || '';

/**
 * Main Material-UI theme
 */
const theme = createMuiTheme({
  palette: {
    primary: { main: color_primary[500] },
    secondary: { main: color_secondary[500] },
    error: { main: color_error[500] },
  },
  typography: {
    fontFamily: [
      'Open Sans',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    useNextVariants: true,
  },
  overrides: {
    "MuiStepIcon": {
      completed: {
        color: '#c00000 !important',
      }
    }
  },
});

/**
 * Main React component
 */
class App extends Component {

  static contextType = AppContext;

  constructor() {
    super();

    // Current app sections
    this.menuItems = [
      {
        id: 'presenta',
        name: 'Presentació',
        path: '/',
      },
      {
        id: 'programes',
        name: 'Programes',
        path: '/programes',
      },
      {
        id: 'projectes',
        name: 'Projectes',
        path: '/programa/1001',
      },
    ];

    // Set the initial state
    this.state = {
      ...DEFAULT_STATE,
      // Immutable attributes:
      updateMap: this.updateMap,
      // Functions used to perform full-text search with Fuse.js on 'centres' and 'programes', built after loading
      fuseFuncs: [],
      menuItems: this.menuItems,
    };
  }

  setStateMod(values, callback = null) {
    this.setState(values, () => {
      if (DEBUG_GLOBAL_VAR)
        window[DEBUG_GLOBAL_VAR] = this.state;
      if (callback)
        callback();
    });
  }


  /**
   * Load datasets from API or JSON files
   */
  loadData() {
    this.setStateMod({ loading: true });
    return Promise.all(
      [
        'data/programes.json', // `${API_ROOT}/programes/`
        'data/instancies.json', // `${API_ROOT}/instancies/`
        'data/centres.json',
        'data/poligons.json',
        'data/estudis.json',
      ].map(uri => {
        return fetch(uri, { method: 'GET', credentials: 'same-origin' })
          .then(Utils.handleFetchErrors)
          .then(response => response.json());
      })
    )
      .then(([_programes, _instancies, _centres, _poligons, _estudis]) => {

        // Build an object with centre ids as keys, useful for optimizing searches
        _centres.forEach(c => {
          c.programes = {};
          c.allPrograms = new Set();
          c.notCert = new Set();
        });

        // Convert synthetic multi-point expressions into arrays of co-ordinates suitable for leaflet polygons
        _poligons.forEach(p => {
          p.poligons = p.poligons.map(pts => pts.split(',').map(pt => pt.split('|').map(vs => Number(vs))));
          p.centresInn = new Set();
          p.programes = new Set();
          p.density = MIN_DENSITY;
          p.estudisBase = {};
          p.estudisPart = {};
          p.centresPart = new Set();
        });

        // Prepare sets for auto-detected data
        const currentPrograms = new Set();

        // Initialize transient properties
        _programes.forEach(p => {
          // Set all programs initially selected
          currentPrograms.add(p.id);
          // Initialize `centres` and `allCentres` (to be filled later)
          p.centres = {};
          p.allCentres = new Set();
        });

        // Convert arrays to maps
        const centres = new Map(_centres.map(c => [c.id, c]));
        const programes = new Map(_programes.map(p => [p.id, p]));
        const poligons = new Map(_poligons.map(p => [p.key, p]));

        // Initialize arrays of `centres` for each program, and `programa` for each centre, by curs
        _instancies.forEach(({ programa, centre, curs, titol, cert }) => {
          const prog = programes.get(programa);
          const cent = centres.get(centre);
          if (prog && cent) {
            (prog.centres[curs] = prog.centres[curs] || []).push(cent);
            prog.allCentres.add(cent);
            (cent.programes[curs] = cent.programes[curs] || []).push(prog);
            cent.allPrograms.add(prog);
            if (cent.sstt) {
              const p = poligons.get(cent.sstt);
              p.centresInn.add(cent);
              p.programes.add(prog);
            }
            if (cent.se) {
              const p = poligons.get(cent.se);
              p.centresInn.add(cent);
              p.programes.add(prog);
            }
            if (titol) {
              if (!prog.titols)
                prog.titols = {};
              prog.titols[cent.id] = `${prog.titols[cent.id] ? `${prog.titols[cent.id]}, ` : ''}"${titol}" (${curs})`;
              if (!cent.titols)
                cent.titols = {};
              cent.titols[prog.id] = `${cent.titols[prog.id] ? `${cent.titols[prog.id]}, ` : ''}"${titol}" (${curs})`;
            }
            if (!cert)
              cent.notCert.add(`${programa}|${curs}`);
          }
          else
            console.log(`WARNING: Instància amb programa o centre desconegut: ${programa} - ${centre} - ${curs}`);
        });

        // Summarize and order programs and centres
        centres.forEach(c => {
          c.allPrograms = Array.from(c.allPrograms).sort((a, b) => a.nom.localeCompare(b.nom));
        });
        programes.forEach(p => {
          p.allCentres = Array.from(p.allCentres).sort((a, b) => a.nom.localeCompare(b.nom));
        });


        // Build the Fuse.js objects
        // See: https://fusejs.io/
        const fuseOptions = {
          caseSensitive: false,
          shouldSort: true,
          tokenize: true,
          matchAllTokens: true,
          includeScore: true,
          includeMatches: true,
          threshold: 0.3,
          location: 0,
          distance: 4,
          maxPatternLength: 32,
          minMatchCharLength: 2,
        };

        const fuseFuncs = [
          new Fuse(
            _programes.map(({ id, nom, simbol, descripcio, titols, ambCurr, ambInn, arees, objectius, requisits, compromisos, contacte, normativa }) => ({
              id,
              nom,
              simbol,
              descripcio,
              titols: titols ? Object.values(titols).join(', ') : '',
              ambCurr: ambCurr.map(a => _estudis.ambitsCurr[a]).join(', '),
              ambInn: ambInn.map(a => _estudis.ambitsInn[a]).join(', '),
              arees: arees.join(', '),
              objectius,
              requisits,
              compromisos,
              contacte,
              normativa,
              tipus: 'programa',
            })),
            { ...fuseOptions, keys: ['id', 'nom', 'descripcio', 'titols', 'ambCurr', 'ambInn', 'arees', 'objectius', 'requisits', 'compromisos', 'contacte', 'normativa'] }),
          new Fuse(
            _centres.map(({ id, nom, municipi, comarca, titols }) => ({
              id,
              nom: `${nom} (${municipi})`,
              comarca,
              titols: titols ? Object.values(titols).join(', ') : '',
              tipus: 'centre',
            })),
            { ...fuseOptions, keys: ['id', 'nom', 'comarca', 'titols'] }),
        ];

        // Update main data object
        const data = {
          ...this.state.data,
          programes,
          centres,
          poligons,
          estudis: new Map(Object.entries(_estudis.estudis)),
          nivells: new Map(Object.entries(_estudis.nivells)),
          ambitsCurr: new Map(Object.entries(_estudis.ambitsCurr)),
          ambitsInn: new Map(Object.entries(_estudis.ambitsInn)),
          cursosDisp: _estudis.cursos,
        };

        // Update the main state
        this.setStateMod({
          data,
          dataLoaded: true,
          polygons: [
            { name: 'Serveis Territorials', shapes: _poligons.filter(p => p.tipus === 'ST') },
            { name: 'Serveis Educatius de Zona', shapes: _poligons.filter(p => p.tipus === 'SEZ') },
          ],
          cursos: [...data.cursosDisp],
          fuseFuncs,
          currentPrograms,
          loading: false,
          error: false,
        });
      })
      .catch(error => {
        // Something wrong happened!
        console.log(error);
        this.setStateMod({ error: error.toString() });
      });
  }

  /**
   * Miscellaneous operations to be performed at startup
   */
  componentDidMount() {
    // Load Google's "Open Sans" font
    Utils.loadGFont('Open Sans');
    // Load datasets
    this.loadData()
      .then(() => {
        // Check if map layers should be updated
        window.setTimeout(() => {
          this.checkForLayerUpdate(window.location.hash ? window.location.hash.substr(1) : '/');
        }, 0);
      });
  }

  /**
   * Update the state of the main component, scrolling to new sections when needed
   * @param {object} [state={}] - The new settings for `state`
   * @param {boolean} [mapChanged=true] - `true` when this change involves map points
   * @param {boolean} [currentProgramsChanged=false] - `true` when the list of current programs has changed
   * @param {function} [callback] - Optional function to be called after state is changed
   */
  updateMap = (state = {}, mapChanged = true, currentProgramsChanged = false, callback = null) => {
    this.setStateMod({ ...state, mapChanged, currentProgramsChanged }, callback);
    window.requestAnimationFrame(() => {
      if (currentProgramsChanged)
        this.updateLayersDensity(this.state.programa ? new Set([this.state.programa]) : this.state.currentPrograms, this.state.cursos);
      if (mapChanged)
        window.setTimeout(() => this.setStateMod({ mapChanged: false }), 0);
    });
  }

  /**
   * Called from CheckRouteChanges when a new path is entered
   * @param {object} props - New properties used, including a react-route location object
   * @param {object} prevProps - Old properties, used for checking changes
   */
  contentUpdated = (props, prevProps) => {
    if (props.location.pathname !== prevProps.location.pathname) {
      this.checkForLayerUpdate(props.location.pathname);
      window.scrollTo(0, 0);
    }
  };

  /**
   * Checks if the polygons density needs to be recalculated, based on the current path
   * @param {string} pathname - Current path
   */
  checkForLayerUpdate = (pathname) => {
    if (/^\/(programes|programa\/|centre\/|zona\/)/.test(pathname)) {
      const check = /^\/programa\/(.*)$/.exec(pathname);
      const programa = check && check.length === 2 ? check[1] : null;
      this.updateMap({ programa }, true, true);
    }
  };

  /**
   * Update the `density` value on each polygon, based on the number of schools enroled to
   * the current programs among the total number of schools on the polygon having at least
   * one of the educational levels targeted by at least one of the current programs.
   * Values can also be filtered by school year.
   * @param {Set} currentPrograms - Set with the `id`s of the programs to be included on the calculation
   * @param {string[]=} cursos - School years to be considered. Defaults to _null_, meaning all available years.
   * @param {object=} data - Object containing the current datasets. Defaults to `data` in the current state.
   */
  updateLayersDensity = (currentPrograms, cursos = null, data = this.state.data) => {

    const { poligons, programes } = data;

    // Clear base arrays
    poligons.forEach(poli => {
      // Clear current density
      poli.density = MIN_DENSITY;

      // `estudisBase` will be filled with the number of "school groups" involved in at least
      // one of the current programs, where each "school group" is an educational level inside a school.
      // key: educational level (EINF2C, EPRI...)      
      // value: number of "school groups" of this educational level on this polygon
      poli.estudisBase = {};

      // `estudisPart` will be filled with the total number of "school groups" participating in at least
      // one of the current programs, where each "school group" is an educational level inside a school.
      // key: educational level (EINF2C, EPRI...)      
      // value: number of "school groups" of this type participating in the current programs on this polygon
      poli.estudisPart = {};

      poli.centresPart = new Set();
    });

    // Object with all `centres` participating in current programs
    // key: school id
    // value: school
    const currentCentres = {};

    // For program, fill `estudisBase` and `currentCentres`
    currentPrograms.forEach(pid => {
      const program = programes.get(pid);
      if (program && program.tipus.length && Object.keys(program.centres).length) {
        program.tipus.forEach(t => {
          poligons.forEach(poli => {
            poli.estudisBase[t] = poli.centres[t] || 0;
          });
        });

        Object.keys(program.centres).forEach(ce => {
          if (!cursos || cursos.includes(ce)) {
            program.centres[ce].forEach(centre => {
              currentCentres[centre.id] = centre;
            });
          }
        });
      }
    });

    // For each school, fill `estudisPart` on their associated polygons (ST and SZ)
    Object.values(currentCentres).forEach(centre => {
      const st = poligons.get(centre.sstt);
      const se = poligons.get(centre.se);
      centre.estudis.forEach(tipus => {
        if (st && st.estudisBase[tipus]) {
          st.estudisPart[tipus] = (st.estudisPart[tipus] ? st.estudisPart[tipus] + 1 : 1);
          st.centresPart.add(centre.id);
        }
        if (se && se.estudisBase[tipus]) {
          se.estudisPart[tipus] = (se.estudisPart[tipus] ? se.estudisPart[tipus] + 1 : 1);
          se.centresPart.add(centre.id);
        }
      });
    });

    // Calculate the density of each polygon
    // (ratio between the summations of `estudisPart` and `estudisBase`)
    let maxDensityST = 0, maxDensitySE = 0;
    poligons.forEach(poli => {
      let n = 0, d = 0;
      Object.keys(poli.estudisBase).forEach(tipus => {
        if (poli.estudisBase[tipus]) {
          n += (poli.estudisPart[tipus] || 0);
          d += poli.estudisBase[tipus];
        }
      });
      if (d > 0) {
        poli.density = Math.max(MIN_DENSITY, n / d);
        if (poli.tipus === 'ST')
          maxDensityST = Math.max(maxDensityST, poli.density);
        else
          maxDensitySE = Math.max(maxDensitySE, poli.density);
      }
    });

    // Compute correction factors
    const factorST = (maxDensityST > MIN_DENSITY && maxDensityST < MINMAX_DENSITY)
      ? MINMAX_DENSITY / maxDensityST
      : maxDensityST > MAX_DENSITY
        ? MAX_DENSITY / maxDensityST
        : 1;
    const factorSE = (maxDensitySE > MIN_DENSITY && maxDensitySE < MINMAX_DENSITY)
      ? MINMAX_DENSITY / maxDensitySE
      : maxDensitySE > MAX_DENSITY
        ? MAX_DENSITY / maxDensitySE
        : 1;

    // Apply correction factors
    poligons.forEach(poli => poli.density *= (poli.tipus === 'ST' ? factorST : factorSE));
  }

  /**
   * Builds the App main component
   */
  render() {

    const { error, loading } = this.state;

    return (
      <Router basename={window.location.pathname}>
        <CssBaseline>
          <MuiThemeProvider theme={theme}>
            <AppContext.Provider value={this.state}>
              <CheckRouteChanges updateHandler={this.contentUpdated}>
                <Header />
                <div className="filler" />
                <main>
                  {
                    (loading && <Loading />) ||
                    (error && <Error {...{ error, refetch: this.loadData }} />) ||
                    <Switch>
                      <Route exact path="/" component={Presentacio} />
                      <Route path="/programes" component={Programes} />
                      <Route path="/centre/:codi" component={FitxaCentre} />
                      <Route path="/programa/:id" component={FitxaPrograma} />
                      <Route path="/zona/:key" component={FitxaZona} />
                      <Route path="/cerca/:query" component={Cerca} />
                      <Redirect to="/" />
                    </Switch>
                  }
                </main>
                <Footer />
              </CheckRouteChanges>
            </AppContext.Provider>
          </MuiThemeProvider>
        </CssBaseline>
      </Router>
    );
  }
}

export default App;
