import React, { Component } from 'react';

import CssBaseline from '@material-ui/core/CssBaseline';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import { createMuiTheme } from '@material-ui/core/styles';
//import color_primary from '@material-ui/core/colors/teal';  // was indigo (teal)
import color_secondary from '@material-ui/core/colors/red';  // was pink (green)
import color_error from '@material-ui/core/colors/red';

import Utils from './utils/Utils';
import Header from './components/Header';
import Presentacio from './components/Presentacio';
import Programes from './components/Programes';
import FitxaPrograma from './components/FitxaPrograma';
import FitxaCentre from './components/FitxaCentre';
import MapSection from './components/MapSection';
import Error from './components/Error';
import Loading from './components/Loading';
import Footer from './components/Footer';
import Cerca from './components/Cerca';

const color_primary = { 500: '#333' };

/**
 * Miscellanous values taken from environment variables
 * and from files: `.env`, `.env.development` and `.env.production`
 */
//const API_ROOT = process.env.REACT_APP_API_ROOT || '../api';

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
    useNextVariants: true,
  },
});

/**
 * Main React component
 */
class App extends Component {

  constructor() {
    super();

    // Container for immutable data
    this.data = {
      programes: [],
      instancies: [],
      centres: [],
      centresByK: {},
      poligons: [],
    }

    // Set initial state
    this.state = {
      loading: true,
      dataLoaded: false,
      intro: true,
      error: false,
      polygons: [],
      currentPrograms: [],
      program: null,
      centre: null,
      modeProgCentre: 'perCurs',
      delayedMapUpdate: true,
      query: null,
    };
  }

  /**
   * Load datasets from API or JSON files
   */
  loadData() {
    this.setState({ loading: true });
    return Promise.all(
      [
        'data/programes.json', // `${API_ROOT}/programes/`
        'data/instancies.json', // `${API_ROOT}/instancies/`
        'data/centres.json',
        'data/poligons.json',
      ].map(uri => {
        return fetch(uri, { method: 'GET', credentials: 'same-origin' })
          .then(Utils.handleFetchErrors)
          .then(response => response.json());
      })
    )
      .then(([programes, instancies, centres, poligons]) => {

        // Build an object with centre ids as keys, useful for optimizing searches
        const centresByK = {};
        centres.forEach(c => {
          c.programes = [];
          centresByK[c.id] = c;
        });

        // Convert synthetic multi-point expressions into arrays of co-ordinates suitable for leaflet polygons
        poligons.forEach(p => {
          p.poligons = p.poligons.map(pts => pts.split(',').map(pt => pt.split('|').map(vs => Number(vs))));
        });

        const currentPrograms = [];

        // Guess missing fields in `programes`
        // (to be supressed!)
        programes.forEach(p => {

          // Set all programs initially selected
          currentPrograms.push(p.id);

          // Initialize `centres` (to be filled later)
          p.centres = {};

          // Empty `tipus`? then try to guess them from title and description
          if (p.tipus.length === 0) {
            const str = `${p.nom} ${p.nomCurt} ${p.descripcio}`;
            if (/(FP|fp|[pP]rofessio)/.test(str))
              p.tipus = ['CFPM', 'CFPS'];
            else if (/(infantil|primària|escola)/.test(str))
              p.tipus = ['EINF2C', 'EPRI'];
            else
              p.tipus = ['EINF2C', 'EPRI', 'ESO'];
          }
        });

        instancies.forEach(ins => {
          // Initialize arrays of `centres` for each program, and `programa` for each centre, by curs
          const programa = programes.find(p => p.id === ins.programa);
          const centre = centresByK[ins.centre];
          if (programa && centre) {
            (programa.centres[ins.curs] = programa.centres[ins.curs] || []).push(centre);
            (centre.programes[ins.curs] = centre.programes[ins.curs] || []).push(programa);
          }
          else
            console.log(`WARNING: Instància amb programa o centre desconegut: ${ins.programa} - ${ins.centre} - ${ins.curs}`);
        });

        // Update main data object
        this.data = {
          programes,
          instancies,
          centres,
          centresByK,
          poligons,
        };

        // Update state
        this.setState({
          dataLoaded: true,
          polygons: [
            { name: 'Serveis Territorials', shapes: poligons.filter(p => p.tipus === 'ST') },
            { name: 'Serveis Educatius de Zona', shapes: poligons.filter(p => p.tipus === 'SEZ') },
          ],
          currentPrograms,
          loading: false,
          error: false,
        });
      })
      .catch(error => {
        // Something wrong happened!
        console.log(error);
        this.setState({ error });
      });
  }

  /**
   * Miscellaneous operations to be performed at startup
   */
  componentDidMount() {
    // Load Google's "Roboto" font
    Utils.loadGFont('Roboto');
    // Load datasets
    this.loadData();
  }

  /**
   * Update the state of the main component, scrolling to new sections when needed
   * @param {object} state - The new settings for `state`
   * @param {boolean} mapChanged - `true` when this change involves map points
   */
  updateMainState = (state, mapChanged = true) => {
    this.setState({ ...state, mapChanged });
    window.requestAnimationFrame(() => {
      const target = document.getElementById('filler');
      if (target)
        target.scrollIntoView({ behavior: 'smooth' });
      if (mapChanged)
        window.setTimeout(() => this.setState({ mapChanged: false }), 0);
    });
  };

  search = (query) => {
    console.log(`Searching: "${query}"`);
    this.setState({ query });
  }

  /**
   * Builds the App main component
   */
  render() {

    // Destructure `data` and `state`
    const data = this.data;
    const { error, loading, intro, currentPrograms, polygons, programa, centre, modeProgCentre, mapChanged, query } = this.state;
    const updateMainState = this.updateMainState;

    // Current app sections
    const menuItems = [
      { id: 'presenta', name: 'Presentació', action: () => this.updateMainState({ intro: true }) },
      { id: 'programes', name: 'Programes', action: () => this.updateMainState({ intro: false, centre: null, programa: null }) },
    ];

    return (
      <CssBaseline>
        <MuiThemeProvider theme={theme}>
          <Header {...{ menuItems, searchFn: this.search, updateMainState }} />
          <div id="filler" />
          <main>
            {
              (error && <Error error={error} refetch={this.loadData} />) ||
              (loading && <Loading />) ||
              (query && <Cerca id="cerca" {...{ query, updateMainState }} />) ||
              (intro && <Presentacio id="presenta" {...{ updateMainState }} />) ||
              (centre && <FitxaCentre {...{ id: 'centre', centre, data, modeProgCentre, updateMainState }} />) ||
              (programa && <FitxaPrograma {...{ id: 'programa', programa, data, updateMainState }} />) ||
              (<Programes {...{ id: 'programes', data, currentPrograms, updateMainState }} />)
            }
            {
              !error && !loading && !intro && !query &&
              <MapSection {...{ id: 'mapa', data, currentPrograms, polygons, programa, centre, mapChanged, updateMainState }} />
            }
          </main>
          <Footer />
        </MuiThemeProvider>
      </CssBaseline>
    );
  }
}

export default App;
