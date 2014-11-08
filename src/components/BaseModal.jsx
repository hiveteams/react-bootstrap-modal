'use strict';
/** @jsx React.DOM */
var React  = require('react')
  , cx     = require('react-classset')
  , extend = require('xtend')
  , Fade   = require('./Fade.jsx')
  
  , $ = require('../dom');

var focusEvent = ('onfocusin' in window) ? 'focusin' : 'focus'
  , SIZES = { large: 'lg', medium: 'md', small: 'sm',xsmall: 'xs' };

var Modal = React.createClass({

  displayName: 'Modal',

  mixins: [
    require('../StackableMixin')
  ],

  propTypes: {
    title:         React.PropTypes.node,
    backdrop:      React.PropTypes.oneOf(['static', true, false]),
    keyboard:      React.PropTypes.bool,
    closeButton:   React.PropTypes.bool,
    animation:     React.PropTypes.bool,
    onRequestHide: React.PropTypes.func.isRequired,
  },

  getInitialState: function() {
    return {
      classes: ''
    };
  },

  getDefaultProps: function () {
    return {
      backdrop:    true,
      keyboard:    true,
      animation:   true,
      closeButton: true,
      attentionAnimation: 'shake'
    };
  },

  render: function () {
    var modalStyle = { display: 'block' }
      , dialogClasses = 'modal-dialog'
      , classes = {
          modal: true,
          fade: !!this.props.animation,
          in:   !this.props.animation
        };

    if(this.props.bsSize)
      dialogClasses += (' modal-' + (SIZES[this.props.bsSize] || this.props.bsSize))

    if(this.state.classes)
      dialogClasses += ' ' + this.state.classes

    return (
      <div ref='modal'
        {...this.props}
        tabIndex='-1'
        title={null}
        role='dialog'
        style={modalStyle}
        className={cx(classes)}
        onClick={this.props.backdrop ? this.handleBackdropClick : null}>
        {this.props.backdrop && this.renderBackdrop()}
        <div className={dialogClasses} ref='dialog'>
          <div className='modal-content'>
            { this.props.title && this.renderHeader() }
            { this.props.children }
            { !this.props.title && this.renderCloseButton() }
          </div>
        </div>
      </div>
    )
  },

  renderBackdrop: function (Modal) {
    var style = this.state.backdropStyle
      , classes = {
          'modal-backdrop': true,
          'fade': this.props.animation,
          'in':   !this.props.animation
        };

    var Backdrop = <div className={cx(classes)} ref="backdrop" key='bd' style={style} onClick={this.handleBackdropClick}/>

    return (<Fade in={this.props.show} animate={this.props.animation}>{Backdrop}</Fade>)
  },

  renderHeader: function () {
    var closeButton = this.renderCloseButton();

    return (
      <div className="modal-header">
        { closeButton }
        { this.renderTitle() }
      </div>)
  },

  renderTitle: function () {
    return (
      React.isValidElement(this.props.title)
        ? this.props.title
        : <h4 className="modal-title">{this.props.title}</h4>
    );
  },

  renderCloseButton: function(){
    return this.props.closeButton
      ? (<button type="button" className="close" aria-hidden="true" onClick={this.props.onRequestHide}>{"×"}</button>)
      : null
  },

  _focus: function(e){
    var self = this
      , el = this.getDOMNode()

    setTimeout(function(){
      if (!self.isTopModal(el))
        e.preventDefault()

      else if ( el !== document.activeElement && !$.contains(el, document.activeElement))
        self.focus()
    }, 0)
  },

  focus: function(){
    //console.log('DO IT', document.activeElement)
    this.refs.modal.getDOMNode().focus()
  },

  attention: function(){
    this.setState({ attention: true, classes: '' })
    this.focus();
  },

  iosClickHack: function () {
    // IOS only allows click events to be delegated to the document on elements
    // it considers 'clickable' - anchors, buttons, etc. We fake a click handler on the
    // DOM nodes themselves. Remove if handled by React: https://github.com/facebook/react/issues/1169
    this.refs.modal.getDOMNode().onclick = function () {};
    this.refs.backdrop.getDOMNode().onclick = function () {};
  },

  componentDidMount: function () {
    this._resizeBackdrop();
    $.on(document, 'keyup', this.handleDocumentKeyUp);
    $.on(document, focusEvent, this._focus, true)

    if (this.props.backdrop && this.props.show)
      this.iosClickHack();
  },

  componentDidUpdate: function (prevProps) {
    this._resizeBackdrop();

    if (this.props.backdrop && this.props.show && this.props.show !== prevProps.show)
      this.iosClickHack();

    if(this.state.attention){
      this.getDOMNode().offsetWidth // trigger reflow to allow animation
      this.setState({ attention: false, classes: this.props.attentionAnimation + ' animated' })
    }
  },

  componentWillUnmount: function () {
    if( this.state.classes)
      this._removeAttentionClasses()

    $.off(document, 'keyup', this.handleDocumentKeyUp);
    $.off(document, focusEvent, this._focus, true)
  },

  handleBackdropClick: function (e) {
    if (e.target !== e.currentTarget) return;
    if (this.props.backdrop === 'static')
      return this.attention()

    this.props.onRequestHide();
  },

  handleDocumentKeyUp: function (e) {
    if (this.props.keyboard && e.keyCode === 27)
      this.props.onRequestHide();
  },

  _resizeBackdrop: function(){
    var modal  = this.refs.modal.getDOMNode()
      , style  = {};

    if(modal.offsetHeight !== modal.scrollHeight && !isOverflowHidden(modal, 'y'))
      style.marginRight = $.scrollbarWidth

    if( Object.keys(style).length && !isEqual(this.state.backdropStyle, style))
      this.setState({ backdropStyle: style })
  },

  _removeAttentionClasses: function(){
    var dialog  = this.refs.dialog.getDOMNode()
      , classes = this.props.attentionAnimation + ' animated';

    dialog.className = dialog.className.replace(classes, '')
    dialog.offsetWidth
  }
});

module.exports = Modal


function isEqual(oldStyle, newStyle){
  if(oldStyle === newStyle) 
    return true

  if((!oldStyle && newStyle) || (!newStyle && oldStyle)) return false
  if(oldStyle.marginRight !== newStyle.marginRight)      return false
  
  return true
}

function isOverflowHidden(node, axis){
  var overflow = $.css(node, 'overflow') + $.css(node, 'overflow-' + axis) 
  return (/hidden/).test(overflow)
}