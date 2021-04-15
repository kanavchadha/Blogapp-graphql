import React from 'react';

import './Image.css';


const image = props => {
  const max_height = props.max_height;
 return <img src={props.imageUrl} width={props.width} height={props.height} style={{maxHeight: max_height}} />
};

export default image;
