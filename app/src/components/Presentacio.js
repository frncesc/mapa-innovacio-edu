import React from 'react';
import Paper from '@material-ui/core/Paper';

function Presentacio(props) {

  const { id } = props;

  return (
    <section id={id} className="seccio presenta">
      <Paper className="paper">
        <h2>Presentació</h2>
        <p>Espai en construcció!</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed et eleifend diam, sed commodo orci. Sed ut eros faucibus, varius velit eget, euismod quam. Vivamus sed odio erat. Cras ac sem egestas nisi vestibulum ultricies. Sed mattis sem quis sagittis pretium. Nulla vel tortor lacinia, venenatis diam non, vulputate ante. Aenean sed nibh eget erat varius aliquet. Sed in condimentum ex, vel elementum ipsum. Morbi rutrum felis sit amet iaculis maximus. Nulla laoreet ante vel lacinia feugiat. Mauris suscipit interdum tellus vitae ultrices. Pellentesque ligula sem, sodales et consequat ut, interdum ut tellus. In laoreet aliquam luctus. Vestibulum at diam ut diam ornare mollis.</p>
      </Paper>
    </section>
  );
}

export default Presentacio;