import fp from 'lodash/fp'

export const iterateAll = body => {
  const edges = fp.compose(
    fp.filter(({ from, to }) => !from.hidden && !to.hidden),
    fp.map(([id, edge]) => edge),
    fp.toPairs,
    fp.get('edges')
  )(body)

  const nodes = fp.compose(
    fp.filter(node => !node.hidden),
    fp.map(([id, node]) => node),
    fp.toPairs,
    fp.get('nodes')
  )(body)

  return { edges, nodes }
}

export const iterateFrom = (node, opt) => {
  const history = { nodes: [], edges: [] }
  const option = {
    self: true,
    direct: false,
    ...opt
  }

  const _iterate = node => {
    history.nodes.push(node)
    
    node.edges.forEach(edge => {
      const { from, to } = edge
  
      if (from.hidden || to.hidden) {
        return
      }
      
      if (to === node) {
        return
      }
      
      if (!history.edges.includes(edge)) {
        history.edges.push(edge)
      }

      if (history.nodes.includes(to)) {
        return
      }
  
      if (option.direct) {
        history.nodes.push(to)
      } else {
        _iterate(to, history)
      }
    })
  }

  _iterate(node)

  if (!option.self) {
    history.nodes = history.nodes.filter(n => n !== node)
  }
  
  return history
}
