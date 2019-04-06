import React, { Component } from 'react';

import CssBaseline from '@material-ui/core/CssBaseline';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import { createMuiTheme } from '@material-ui/core/styles';
import color_primary from '@material-ui/core/colors/red';  // was indigo (teal)
import color_secondary from '@material-ui/core/colors/teal';  // was pink (green)
import color_error from '@material-ui/core/colors/red';

import Utils from './utils/Utils';
import Header from './components/Header';
import Presentacio from './components/Presentacio';
import Programes from './components/Programes';
import MapSection from './components/MapSection';
import Centre from './components/Centre';
import Error from './components/Error';
import Loading from './components/Loading';

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

    // Set initial state
    this.state = {
      data: {
        programes: [],
        instancies: [],
        centres: [],
        centresByK: {},
        poligons: [],
      },
      currentPoints: [],
      loading: true,
      error: false,
    };
  }

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
        centres.forEach(c => centresByK[c.id] = c);

        // Update state
        this.setState({
          data: {
            programes,
            instancies,
            centres,
            centresByK,
            poligons,
          },
          currentPoints: centres,
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
    // Load data
    this.loadData();
  }

  seccions = [
    { id: 'presenta', name: 'Presentació' },
    { id: 'programes', name: 'Programes' },
    { id: 'mapa', name: 'Mapa' },
  ];

  render() {

    const { error, loading, data, currentPoints } = this.state;

    return (
      <CssBaseline>
        <MuiThemeProvider theme={theme}>
          <Header menuItems={this.seccions} />
          {
            (error && <Error error={error} refetch={this.loadData} />) ||
            (loading && <Loading />) ||
            <main>
              <Presentacio id="presenta" />
              <Programes {...{ id: 'programes', data }} />
              <MapSection {...{ id: 'mapa', data, currentPoints }} />
              <Centre id="centre" />
            </main>
          }
        </MuiThemeProvider>
      </CssBaseline>
    );
  }
}

export default App;
