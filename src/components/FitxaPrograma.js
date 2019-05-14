import React from 'react';
import ReactMarkdown from 'react-markdown/with-html';
import AppContext from '../AppContext';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ArrowBack from '@material-ui/icons/ArrowBack';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import InfoIcon from '@material-ui/icons/Info';
import MailIcon from '@material-ui/icons/Mail';
import Error from './Error';
import MapSection from './MapSection';

const MD_OPTIONS = {
  escapeHtml: false,
};

function createExpansionPanel(className, title, content) {
  return (
    <ExpansionPanel className={className}>
      <ExpansionPanelSummary className="small-padding-h" expandIcon={<ExpandMoreIcon />}>
        <h4 style={{ marginTop: 0 }}>{title}</h4>
      </ExpansionPanelSummary>
      <ExpansionPanelDetails className="small-padding-h">
        {content}
      </ExpansionPanelDetails>
    </ExpansionPanel>
  );
}

function createMDExpansionPanel(className, title, mdContent) {
  return createExpansionPanel(className, title,
    <div>
      <ReactMarkdown {...MD_OPTIONS}>
        {mdContent}
      </ReactMarkdown>
    </div>
  );
}


function FitxaPrograma({ history, match: { params: { id } } }) {

  return (
    <AppContext.Consumer>
      {({ data, cursos, currentPrograms, polygons, mapChanged, updateMap }) => {
        const { programes, estudis, ambitsCurr, ambitsInn } = data;

        // Find the specified program
        const programa = programes.get(id);
        if (!programa)
          return <Error {...{ error: `No hi ha cap programa amb el codi: ${id}`, history }} />

        // Els camps id, nomCurt i color no s'utilitzen
        const { nom, descripcio, link, ambCurr, ambInn, fitxa, video, objectius, requisits, compromisos, contacte, normativa, arees, simbol, tipus, centres } = programa;

        const torna = () => history.goBack();

        return (
          <>
            <Button className="torna" aria-label="Torna" onClick={torna} >
              <ArrowBack className="left-icon" />
              Torna
            </Button>
            <section className="seccio programa">
              <Paper className="paper">
                <div id="descripcio">
                  {simbol && <img className="prog-logo" src={`logos/${simbol}`} alt={nom}></img>}
                  <h2>{nom}</h2>
                  <ReactMarkdown {...MD_OPTIONS}>
                    {descripcio}
                  </ReactMarkdown>
                </div>
                <div id="info">
                  {fitxa &&
                    <Button variant="contained" className="prog-info-btn" href={fitxa} >
                      <CloudDownloadIcon className="left-icon" />
                      Fitxa
                    </Button>
                  }
                  {link &&
                    <Button variant="contained" className="prog-info-btn" href={link} >
                      <InfoIcon className="left-icon" />
                      Web
                    </Button>
                  }
                  {contacte &&
                    <Button variant="contained" className="prog-info-btn" href={`mailto:${contacte}`} >
                      <MailIcon className="left-icon" />
                      Contacte
                    </Button>
                  }
                  {video &&
                    <div className="prog-video">
                      <br />
                      <ReactMarkdown {...MD_OPTIONS}>
                        {video}
                      </ReactMarkdown>
                    </div>
                  }
                </div>
                {objectius && createMDExpansionPanel('prog-objectius', 'Objectius', objectius)}
                {requisits && createMDExpansionPanel('prog-requisits', 'Requisits', requisits)}
                {compromisos && createMDExpansionPanel('prog-compromisos', 'Compromisos', compromisos)}
                {normativa && createMDExpansionPanel('prog-normativa', 'Normativa', normativa)}
                {createExpansionPanel('prog-ambits', 'Àmbits, àrees i nivells', (
                  <div>
                    {ambInn.length > 0 &&
                      <div className="prog_ambits">
                        <h4>Àmbits d'innovació:</h4>
                        <ul>
                          {ambInn.map(a => <li key={a}>{ambitsInn.get(a)}</li>)}
                        </ul>
                      </div>
                    }
                    {ambCurr.length > 0 &&
                      <div className="prog_ambits">
                        <h4>Àmbits curriculars:</h4>
                        <ul>
                          {ambCurr.map(a => <li key={a}>{ambitsCurr.get(a)}</li>)}
                        </ul>
                      </div>
                    }
                    {arees.length > 0 &&
                      <div className="prog_ambits">
                        <h4>Àrees curriculars:</h4>
                        <ul>
                          {arees.map((a, n) => <li key={n}>{a}</li>)}
                        </ul>
                      </div>
                    }
                    {tipus.length > 0 &&
                      <div className="prog_ambits">
                        <h4>Nivells educatius:</h4>
                        <ul>
                          {tipus.map((t, n) => <li key={n}>{estudis.get(t)}</li>)}
                        </ul>
                      </div>
                    }
                  </div>
                ))}
                <br />
                {Object.keys(centres).map((curs, n) => (
                  <ExpansionPanel key={n}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography className="wider">{`CURS ${curs}`}</Typography>
                      <Typography>{`${centres[curs].length} ${centres[curs].length === 1 ? 'centre' : 'centres'}`}</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails className="small-padding-h">
                      <List dense>
                        {centres[curs].sort((a, b) => a.nom.localeCompare(b.nom)).map(({ id: codi, nom, municipi, titols }, c) => (
                          <ListItem key={c} button component="a" href={`#/centre/${codi}`} className="small-padding-h">
                            <ListItemText
                              primary={`${nom} (${municipi})`}
                              secondary={(titols && titols[id] ? titols[id] : null)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                ))}
              </Paper>
            </section>
            <MapSection {...{ data, programa: id, centre: null, zona: null, cursos, currentPrograms, polygons, mapChanged, history, updateMap }} />
          </>
        );
      }}
    </AppContext.Consumer>
  );
}

export default FitxaPrograma;
