import React, { Fragment } from 'react';

import Button from '../../Button/Button';
import Image from '../../Image/Image';
import './Post.css';

const post = props => (
  <article className="post">
    <h3 className="post__meta">
      Posted by {props.author.name} on {props.date}
    </h3>
    <header className="post__header">
      <div>
        <h1 className="post__title">{props.title}</h1>
        <div className="post__content">{props.content}</div>
      </div>
      {/* <div className="post__image"> */}
      <Image imageUrl={props.image} width='40%' height='110px' />
      {/* </div> */}
    </header>

    <div className="post__actions">
      <div className="claps">  
         <img className="clap" src="https://i.postimg.cc/TYPFxKcB/clap.png"></img>
         <span>{props.claps} </span>
      </div>
      <div>
        <Button mode="flat" link={props.id}>
          View
        </Button>

        {
          props.userId.toString() === props.author._id.toString() ?
            <Fragment>
              <Button mode="flat" onClick={props.onStartEdit}>
                Edit
            </Button>
              <Button mode="flat" design="danger" onClick={props.onDelete}>
                Delete
            </Button>
            </Fragment>
            : null
        }
      </div>

    </div>
  </article>
);

export default post;
