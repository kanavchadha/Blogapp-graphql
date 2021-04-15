import React, { Component, Fragment } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    const graphqlQuery = {
      query: `{
        currUser {
            status
            _id
          }
        }`
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery)
    }).then(res => {
        return res.json();
      })
      .then(resData => {
        console.log(resData);
        if (resData.errors) {
          throw new Error('Failed to fetch user status.');
        }
        this.setState({ status: resData.data.currUser.status });

      }).catch(this.catchError);

    this.loadPosts();

    // window.addEventListener('scroll',function () {
    //   if (window.pageYOffset > document.querySelector('.wrapper').offsetTop) {
    //     document.querySelector('.wrapper').classList.add('fittop')
    //   } else {
    //     document.querySelector('.wrapper').classList.remove('fittop')
    //   }
    // });

  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    const graphqlQuery = {
      query: `
        query FetchPosts ($currPage: Int!) {
          posts(page: $currPage) {
            totalPosts
            posts {
              _id
              title
              imageUrl
              claps{
                totalClaps
              }
              content
              creator {
                _id
                name
              }
              createdAt
            }
          }
        }
      `,
      variables: { // we can also use variable to pass arguments in graphql query.
        currPage: page 
      }
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error('Failed to fetch posts.');
        }
        // console.log(resData.data);
        this.setState({
          posts: resData.data.posts.posts.map(p => {
            return { ...p, imageUrl: p.imageUrl }
          }),
          totalPosts: resData.data.posts.totalPosts,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    const status = this.state.status;
    const graphqlQuery = {
      query: ` 
        mutation {
          setStatus(status: "${status}")
        }
      `
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    }).then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error("Can't update status!");
        }
        this.setState({ status: resData.data.status });
        console.log(resData);
      }).catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    const formData = new FormData();
    formData.append('image', postData.image);
    if (this.state.editPost) {
      formData.append('image', this.state.editPost.imagePath);
    }
    fetch('http://localhost:8080/post-image', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + this.props.token },
      body: formData
    }).then(res => res.json())
      .then(resFileData => {
        const imageUrl = resFileData.imagePath || 'undefined';
        let graphqlQuery = {
          query: `
            mutation {
              createPost(postInput: {title: "${postData.title}",imageUrl: "${imageUrl}",content: "${postData.content}"}) {
                _id
                title
                imageUrl
                content
                claps{
                  totalClaps
                }
                creator {
                  name
                  _id
                }
                createdAt
              }
            }
          `
        }

        if(this.state.editPost){
          graphqlQuery = {
            query: `
              mutation {
                updatePost(id: "${this.state.editPost._id}",postInput: {title: "${postData.title}",imageUrl: "${imageUrl}",content: "${postData.content}"}) {
                  _id
                  title
                  imageUrl
                  content
                  claps{
                    totalClaps
                  }
                  creator {
                    _id
                    name
                  }
                  createdAt
                }
              }
            `
          }  
        }

        return fetch('http://localhost:8080/graphql', {
          headers: {
            Authorization: 'Bearer ' + this.props.token,
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify(graphqlQuery)
        })
      }).then(res => {
        return res.json();
      }).then(resData => {
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error("Validation failed.");
        }
        if (resData.errors) {
          throw new Error('creation of post failed!');
        }
        console.log(resData);
        let resDataField = 'createPost';
        if(this.state.editPost){
          resDataField = 'updatePost';
        }
        const post = {
          _id: resData.data[resDataField]._id,
          title: resData.data[resDataField].title,
          imageUrl: resData.data[resDataField].imageUrl,
          claps: resData.data[resDataField].claps,
          content: resData.data[resDataField].content,
          creator: resData.data[resDataField].creator,
          createdAt: resData.data[resDataField].createdAt
        };
        this.setState(prevState => {
          let updatedTotalPosts = prevState.totalPosts;
          let updatedPosts = [...prevState.posts];
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              p => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = post;
          }
          else {
            updatedTotalPosts++;
            if(prevState.posts.length >= 3){
              updatedPosts.pop();
            }
            updatedPosts.unshift(post);
          }
          return {
            posts: updatedPosts,
            totalPosts: updatedTotalPosts,
            isEditing: false,
            editPost: null,
            editLoading: false
          };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    const graphqlQuery = {
      query: ` mutation {
          deletePost(postId: "${postId}") 
        }`
    }  
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    }).then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error('Deleting a post failed!');
        }
        console.log(resData);
        this.loadPosts();
        // this.setState(prevState => {
        //   const updatedPosts = prevState.posts.filter(p => p._id !== postId);
        //   return { posts: updatedPosts, postsLoading: false };
        // });
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false, error: err });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <div className="wrapper fittop">
          <section className="feed__status">
            <Button mode="raised" design="accent" onClick={this.newPostHandler}>
              New Post
            </Button>
            <form onSubmit={this.statusUpdateHandler}>
              <Input
                type="text"
                placeholder="Your status"
                control="input"
                onChange={this.statusInputChangeHandler}
                value={this.state.status}
              />
              <Button mode="flat" design="accent" type="submit">
                Update
            </Button>
            </form>
          </section>
        </div>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 3)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  claps={post.claps.totalClaps}
                  title={post.title}
                  userId={this.props.userId}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
