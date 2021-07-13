import React, { useState, useRef, useEffect, useCallback } from 'react'
import cn from 'classnames'
import Graph from './react-network'
import Hammer from 'hammerjs'
import './style.scss'

const getDomNodeStyle = (node, dom) => ({
  ...node,
  widthConstraint: dom.clientWidth,
  heightConstraint: dom.clientHeight,
  shape: 'box',
  margin: 0.01,
  color: {
    border: '#0000',
    background: '#0000',
    highlight: {
      border: '#0000',
      background: '#0000'
    },
    hover: {
      border: '#0000',
      background: '#0000'
    }
  }
})

const decideNodeDom = node => !!node.dom && !node.hidden

const connectHammer = (el, network) => {
  const hammer = new Hammer(el)
  hammer.on('hammer.input', e => e.isFirst && network.body.eventListeners.onTouch(e))
  hammer.on('panstart', network.body.eventListeners.onDragStart)
  hammer.on('panmove', network.body.eventListeners.onDrag)
  hammer.on('panend', network.body.eventListeners.onDragEnd)
  hammer.on('press', network.body.eventListeners.onHold)
  hammer.on('tap', network.body.eventListeners.onTap)
  el.addEventListener('wheel', network.body.eventListeners.onMouseWheel)
}

function Network(props) {
  const { edges, options, popups, className, style } = props

  const [nodes, setNodes] = useState(props.nodes)
  const [popupOnEdgeClick, setPopupOnEdgeClick] = useState(null)
  const [popupOnNodeHover, setPopupOnNodeHover] = useState(null)

  const popupOnNodeHoverRef = useRef()
  const popupOnEdgeClickRef = useRef()
  const hoverNodeRef = useRef()
  const networkRef = useRef()
  const domRef = useRef({})

  const getNodeDomCount = useCallback(() => {
    return props.nodes.filter(decideNodeDom).length
  }, [props.nodes])

  useEffect(() => {
    domRef.current = {}
    if (getNodeDomCount() === 0) {
      setNodes(props.nodes)
    }
  }, [props.nodes, getNodeDomCount])

  useEffect(() => {
    if (popupOnNodeHover) {
      setPopupOnNodeHover({
        render: popups.popupOnNodeHover(popupOnNodeHover.event),
        event: popupOnNodeHover.event
      })
    }
  }, [props.nodes])

  const getDomRef = key => el => {
    const dom = domRef.current
    const network = networkRef.current

    if (!dom[key] && el) {
      dom[key] = el
      network && connectHammer(el, network)

      if (Object.keys(dom).length === getNodeDomCount()) {
        setNodes(props.nodes.map(node => getDomNodeStyle(node, dom[node.id])))
      }
    }
  }

  const getPopupOnNodeHoverRef = el => {
    if (el && !popupOnNodeHoverRef.current) {
      connectHammer(el, networkRef.current)
      popupOnNodeHoverRef.current = el
    }
  }

  const handleAfterDrawing = e => {
    const network = networkRef.current
    const dom = domRef.current
    const pos = network.getPositions()
    const scale = network.getScale()
    
    nodes.forEach(({ id }) => {
      if (dom[id]) {
        const { x, y } = network.canvasToDOM({
          x: pos[id].x,
          y: pos[id].y
        })
  
        dom[id].style.left = `${x}px`
        dom[id].style.top = `${y}px`
        dom[id].style.transform = `translate(-50%, -50%) scale(${scale})`
      }

      if (hoverNodeRef.current === id) {
        const popupOnNodeHover = popupOnNodeHoverRef.current
        const { x, y } = network.canvasToDOM({
          x: pos[id].x,
          y: pos[id].y
        })

        popupOnNodeHover.style.left = `${x}px`
        popupOnNodeHover.style.top = `${y}px`
        popupOnNodeHover.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(50%)`
      }
    })
    props.events && props.events.afterDrawing && props.events.afterDrawing(e)
  }

  const handleClick = e => {
    const popupDom = popupOnEdgeClickRef.current

    if (e.edges.length) {
      if (popups && popups.popupOnEdgeClick) {
        popupDom.style.left = e.event.center.x + 'px'
        popupDom.style.top = e.event.center.y + 'px'
        popupDom.style.opacity = 1
        setPopupOnEdgeClick(popups.popupOnEdgeClick(e))
      }
    } else {
      popupDom.style.opacity = 0
    }
    props.events && props.events.click && props.events.click(e)
  }

  const handleZoom = e => {
    popupOnEdgeClickRef.current.style.opacity = 0
    props.events && props.events.zoom && props.events.zoom(e)
  }

  const handleDragStart = e => {
    popupOnEdgeClickRef.current.style.opacity = 0
    props.events && props.events.dragStart && props.events.dragStart(e)
  }

  const handleHoverNode = e => {
    const network = networkRef.current
    const popupOnNodeHover = popupOnNodeHoverRef.current

    if (popups && popups.popupOnNodeHover && popupOnNodeHover && network) {
      const pos = network.getPosition(e.node)
      const scale = network.getScale()
      const { x, y } = network.canvasToDOM(pos)

      popupOnNodeHover.style.left = `${x}px`
      popupOnNodeHover.style.top = `${y}px`
      popupOnNodeHover.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(50%)`
      hoverNodeRef.current = e.node

      setPopupOnNodeHover({
        render: popups.popupOnNodeHover(e),
        event: e
      })
    }
    props.events && props.events.hoverNode && props.events.hoverNode(e)
  }

  const handleBlurNode = e => {
    if (e.event.buttons === 0) {
      hoverNodeRef.current = null
      setPopupOnNodeHover(null)
      props.events && props.events.blurNode && props.events.blurNode(e)
    }
  }

  const handleDomMouseMove = e => {
    if (networkRef.current) {
      networkRef.current.body.eventListeners.onMouseMove(e)
    }
  }

  const getNetwork = obj => {
    networkRef.current = obj
    props.getNetwork && props.getNetwork(obj)
  }

  const events = {
    ...props.events,
    'afterDrawing': handleAfterDrawing,
    'click': handleClick,
    'zoom': handleZoom,
    'dragStart': handleDragStart,
    'hoverNode': handleHoverNode,
    'blurNode': handleBlurNode
  }

  return (
    <div className={cn('Network', className)} style={style}>
      <Graph
        nodes={nodes}
        edges={edges}
        options={options}
        events={events}
        getNetwork={getNetwork}
      />
      <div className='Network__overlays'>
        {props.nodes.map(node => decideNodeDom(node) && (
          <div
            className='Network__overlay-dom'
            onMouseMove={handleDomMouseMove}
            ref={getDomRef(node.id)}
            key={node.id}
          >
            {node.dom}
          </div>
        ))}
      </div>
      <div className='Network__popup-edge-click' ref={popupOnEdgeClickRef}>
        {popupOnEdgeClick}
      </div>
      <div className='Network__popup-node-hover' ref={getPopupOnNodeHoverRef} >
        {popupOnNodeHover && popupOnNodeHover.render}
      </div>
    </div>
  )
}

export default Network
