import React from 'react';
import { Link } from 'react-router-dom';
import { Map, Polygon, Marker, Popup, LayersControl, LayerGroup } from 'react-leaflet';
import TileLayer from '../utils/TileLayer';
import MarkerClusterGroup from '../utils/MarkerClusterGroup';
// Moved to `index.js`:
// import 'react-leaflet-fullscreen/dist/styles.css';
import FullscreenControl from 'react-leaflet-fullscreen';
import Utils from '../utils/Utils';

// See ../utils/TileLayer for all available options
const TILE_LAYER = process.env.REACT_APP_TILE_LAYER || 'wikimedia';
const PRESERVE_MAP_BOUNDS = (process.env.REACT_APP_PRESERVE_MAP_BOUNDS || 'true') === 'true';

// Enlarge map bounds to make space for popups
const MAP_BOUNDS = [[40.50, 0.15], [42.90, 3.34]];
const MAX_BOUNDS = [[39.50, -0.85], [43.90, 4.34]];

// Options for MarkerCluster
// See: https://github.com/Leaflet/Leaflet.markercluster
const MARKERCLUSTER_PROPS = {
  showCoverageOnHover: false, // Default is `true`
  maxClusterRadius: 30, // Default is 80
};

export default function MainMap({ points = [], polygons = [], estudis = [], programa = null, poli = null, zoom = 8, maxZoom = 13, updateMap }) {

  // Optional overlays
  const OVERLAYS = [
    {
      name: 'Mostra la participació per zones',
      flag: 'showDensity',
      default: false,
    },
    {
      name: 'Mostra els centres',
      flag: 'showCentres',
      default: true,
    },
  ];

  // Save overlay preferences to browser's local storage
  const OVERLAY_SETTINGS_STORAGE = window.localStorage;
  const getBool = key => OVERLAY_SETTINGS_STORAGE.getItem(key) === 'true';
  const getInt = key => Number(OVERLAY_SETTINGS_STORAGE.getItem(key));
  const setVal = (key, val) => OVERLAY_SETTINGS_STORAGE.setItem(key, val);

  // Save the current map bounds in session storage, thus allowing to navigate between pages preserving map layout.
  const MAP_BOUNDS_STORAGE = window.sessionStorage;
  const saveBounds = (bounds) => MAP_BOUNDS_STORAGE.setItem('mapBounds', bounds.toBBoxString());
  const getSavedBounds = () => {
    const str = MAP_BOUNDS_STORAGE.getItem('mapBounds');
    if (!str)
      return null;
    const values = str.split(',');
    if (values.length !== 4)
      return null;
    return [[
      Number(values[1]), // Lat SW
      Number(values[0]), // Lng SW
    ], [
      Number(values[3]), // Lat NE
      Number(values[2]), // Lng NE
    ]];
  };

  // Don't preserve map bounds in `single polygon` mode
  const preserveBounds = PRESERVE_MAP_BOUNDS && poli === null;
  const currentlySavedBounds = preserveBounds && getSavedBounds();

  // Handle zoom changes
  const boundsChanged = ev => {
    if (preserveBounds && ev.target && ev.target.getBounds)
      saveBounds(ev.target.getBounds());
  }

  // Line width and opacity of polygons
  const lineWidth = 2;
  const minOpacity = 0;

  // Force `updateMap` when changing some layout settings
  const onBaseLayerChange = (ev) => {
    const layerIndex = polygons.findIndex(p => p.name === ev.name);
    if (layerIndex >= 0) {
      setVal('currentLayer', layerIndex);
      if (getBool(OVERLAYS[0].flag))
        updateMap({}, false);
    }
  }

  // Force `updateMap` when changing some overlay settings
  const overlayChange = (type) => (ev) => {
    const ov = OVERLAYS.findIndex(ov => ov.name === ev.name);
    if (ov >= 0) {
      const overlayVisible = (type === 'add');
      OVERLAY_SETTINGS_STORAGE.setItem(OVERLAYS[ov].flag, overlayVisible);
      if (ov === 0 && overlayVisible)
        updateMap({}, false);
    }
  }

  // Current layer defaults to "SEZ" (índex 1)
  const currentLayer = getInt('currentLayer');
  setVal('currentLayer', currentLayer);

  // Set default or stored value in each overlay
  OVERLAYS.forEach(ov => {
    const stored = OVERLAY_SETTINGS_STORAGE.getItem(ov.flag);
    setVal(ov.flag, stored === null ? ov.default : stored);
  });

  const popupCentre = (centre) => (
    <Popup>
      <h4><Link to={`/centre/${centre.id}`}>{centre.nom}</Link></h4>
      <p>{centre.adreca}<br />
        <a href={centre.web} target="_blank" rel="noopener noreferrer">{centre.web}</a></p>
      <p>{`${centre.estudis.map(e => estudis.get(e)).join(', ')}.`}</p>
    </Popup>
  );

  const popupZona = (zona) => {
    const centresPart = zona.centresPart.size;
    const estudisPart = Utils.sumAll(zona.estudisPart);
    const estudisBase = Utils.sumAll(zona.estudisBase);
    const perCent = (estudisBase > 0 ? (estudisPart / estudisBase) * 100 : 0).toFixed(1);
    return <Popup>
      <h4><Link to={`/zona/${zona.key}`}>{zona.nom}</Link></h4>
      {(centresPart &&
        <p>
          <span>{`Centres participants ${programa ? 'al programa seleccionat' : 'als programes seleccionats'}: ${centresPart}`}</span><br />
          <span>{`Índex de participació: ${perCent}%`}</span>
        </p>) ||
        <p>No hi ha cap centre que participi als programes seleccionats.</p>
      }
    </Popup>
  };

  return (
    <Map
      className="mapa markercluster-map"
      {...{
        maxZoom,
        minZoom: zoom,
        bounds: (poli && poli.bounds) || currentlySavedBounds || MAP_BOUNDS,
        maxBounds: MAX_BOUNDS,
        onBaseLayerChange,
        onOverlayAdd: overlayChange('add'),
        onOverlayRemove: overlayChange('remove'),
        onZoomEnd: boundsChanged,
        onMoveEnd: boundsChanged,
      }}
    >
      <TileLayer type={TILE_LAYER} />
      <LayersControl position="topright">
        {polygons.map((p, i) => (
          <LayersControl.BaseLayer name={p.name} key={i} checked={poli !== null ? i === (poli.tipus === 'SEZ' ? 1 : 0) : i === currentLayer}>
            <LayerGroup>
              {p.shapes.filter(sh => poli === null || poli === sh).map((sh, n) => (
                <Polygon key={n} positions={sh.poligons} weight={lineWidth} fillOpacity={minOpacity}>
                  {popupZona(sh)}
                </Polygon>))}
            </LayerGroup>
          </LayersControl.BaseLayer>
        ))}
        <LayersControl.Overlay name={OVERLAYS[0].name} checked={poli === null && getBool(OVERLAYS[0].flag)}>
          <LayerGroup>
            {polygons[currentLayer].shapes.filter(sh => poli === null || poli === sh).map((sh, n) => (
              <Polygon key={n} positions={sh.poligons} weight={0} fillOpacity={sh.density}>
                {popupZona(sh)}
              </Polygon>))}
          </LayerGroup>
        </LayersControl.Overlay>
        <LayersControl.Overlay name={OVERLAYS[1].name} checked={poli !== null || getBool(OVERLAYS[1].flag)}>
          <MarkerClusterGroup clusterProps={MARKERCLUSTER_PROPS}>
            {points.map(pt => (
              <Marker key={pt.id} position={[pt.lat, pt.lng]}>
                {popupCentre(pt)}
              </Marker>
            ))}
          </MarkerClusterGroup>
        </LayersControl.Overlay>
      </LayersControl>
      <FullscreenControl
        position="topleft"
        title="Mostra el mapa a pantalla completa"
        titleCancel="Surt de la pantalla completa"
      />
    </Map>
  )
}
