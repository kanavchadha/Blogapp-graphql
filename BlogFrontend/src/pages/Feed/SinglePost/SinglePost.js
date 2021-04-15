import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: '',
    claps: 0,
    clapData: []
  };


  componentDidMount() {
    const postId = this.props.match.params.postId;
    const graphqlQuery = {
      query: `{
        post(postId: "${postId}") {
          _id
          title
          imageUrl
          claps{
            totalClaps
            clap
          }
          creator {
            name
          }
          createdAt
          content
        }
      }`
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error('Failed to fetch Post!');
        }

        this.setState({
            title: resData.data.post.title,
            image: 'http://localhost:8080/' + resData.data.post.imageUrl,
            author: resData.data.post.creator.name,
            date: new Date(resData.data.post.createdAt).toLocaleDateString('en-US'),
            content: resData.data.post.content,
            claps: resData.data.post.claps.totalClaps,
            clapData: resData.data.post.claps.clap
        });

      })
      .catch(err => {
        console.log(err);
      });
  }

  hitClap = () => {
    const postId = this.props.match.params.postId;
    const graphqlQuery = {
      query: ` mutation {
        clap(postId: "${postId}"){
          totalClaps
          clap
        }
      
      }`
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error('Failed to fetch Post!');
        }
        console.log(resData);
        this.setState({
          claps: resData.data.clap.totalClaps,
          clapData: resData.data.clap.clap
        });
      }).catch(err => {
        console.log(err);
      });
  }

  render() {
    let clapped = <img src="https://img.icons8.com/ios/50/000000/applause.png" onClick={this.hitClap} />
    const isClapped = this.state.clapData.includes(this.props.userId.toString());
    if(isClapped){
      clapped = <img className="clapped" src="https://i.postimg.cc/TYPFxKcB/clap.png" onClick={this.hitClap}></img>
    }

    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2 className="post-data">
          <span>Created by {this.state.author} on {this.state.date}</span>
          <span className="post-claps">
            <b>{this.state.claps}</b>
            {clapped}
          </span>
        </h2>
        <div className="single-post__image">
          <Image width="100%" imageUrl={this.state.image} max_height='350px' />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
