import React from 'react';
import AppContext from '../AppContext';
import ReactMarkdown from 'react-markdown/with-html';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import MapIcon from '@material-ui/icons/Map';
import { A2HS_BTN_CLASSNAME, PWAIcon, a2hsHandleClick, a2hsButtonStyle } from '../utils/A2HS';
import { intro } from '../literals';

const MD_OPTIONS = {
  escapeHtml: false,
};

function Presentacio({ history }) {

  return (
    <AppContext.Consumer>
      {({ data }) => {
        return (
          <section className="seccio presenta">
            <Paper className="paper">
              <ReactMarkdown {...MD_OPTIONS}>
                {intro}
              </ReactMarkdown>
              <div className="control-group">
                <Button
                  variant="contained"
                  onClick={() => history.push('/programes')}
                >
                  <MapIcon className="left-icon" color="secondary" />
                  Accés al mapa
                </Button>
                <Button
                  className={A2HS_BTN_CLASSNAME}
                  variant="contained"
                  style={a2hsButtonStyle()}
                  onClick={a2hsHandleClick}
                >
                  <PWAIcon className="left-icon" />
                  Instal·la l'aplicació
                  </Button>
              </div>
              <div className="hidden">
                { /* Preload icons in a hidden div */
                  data.programes && Array.from(data.programes.values()).map((p, n) => (
                    <img alt="" key={n} src={`logos/${p.simbol}`} />
                  ))
                }
              </div>
            </Paper>
          </section>
        );
      }}
    </AppContext.Consumer>
  );
}

export default Presentacio;