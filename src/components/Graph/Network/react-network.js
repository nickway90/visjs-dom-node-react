import React, { useEffect, useRef } from 'react';
import * as vis from 'vis-network/standalone';


function Graph({ className, nodes, edges, events, options, getNetwork }) {
  const network = useRef()

  useEffect(() => {
    if (network.current && nodes) {
      network.current.body.data.nodes.update(nodes)
    }
  }, [nodes])

  useEffect(() => {
    if (network.current && edges) {
      network.current.body.data.edges.update(edges)
    }
  }, [edges])

  useEffect(() => {
    if (network.current && events) {
      Object.keys(events).forEach(name => {
        network.current.off(name)
        network.current.on(name, events[name])
      })
    }
  }, [events])

  useEffect(() => {
    if (network.current && options) {
      network.current.setOptions(options)
    }
  }, [options])

  const setContainerRef = el => {
    if (!network.current) {
      network.current = new vis.Network(el, { nodes, edges}, options)
      getNetwork && getNetwork(network.current)
    }
  }

  return (
    <div
      className={className}
      ref={setContainerRef}
      style={{ height: '100%' }}
    />
  )
}

export default Graph
