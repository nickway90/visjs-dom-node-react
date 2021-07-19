import React, { useEffect, useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faEye, faEyeSlash, faAngleRight, faAngleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons'
import fp from 'lodash/fp'
import xor from 'lodash/xor'
import Graph, { iterateFrom, csvExport, dumpEdge, styles } from 'components/Graph'
import vo from './vis-options'
import neo4j from 'neo4j-driver'
import mockDriver from './mock-driver'
import queryGraph from 'neo4j'
import './style.scss'

// const driver = neo4j
const driver = mockDriver

const fpIterateFrom = opt => node => iterateFrom(node, opt)

// const nodes = ['one', 'two', 'three', 'four'].map((label, i) => ({
//   id: i + 1,
//   label,
//   dom: (
//     <div className='overlay'>
//       <div className='command-panel'>
//         <span className='command' onClick={() => alert(`command 1 for node ${label}`)}>c1</span>
//         <span className='command' onClick={() => alert(`command 2 for node ${label}`)}>c2</span>
//       </div>
//       {label}
//     </div>
//   )
// }))

// const edges = [
//   {id: '1-3', from: 1, to: 3},
//   {id: '1-2', from: 1, to: 2},
//   {id: '1-4', from: 1, to: 4},
// ]

const visOptions = {
  height: '100%',
  width: '100%',
  autoResize: true,
  groups: {
    PROG: { mass: 1, shape: 'dot', x: 0, y: -1000 },
    FUNC: { mass: 1, shape: 'dot', color: '#f5ab70' },
    METH: { mass: 1, shape: 'dot', color: '#059494' },
    DTEL: { mass: 2, shape: 'dot', color: '#059494' },
    STRU: { mass: 2, shape: 'dot', color: '#00b8ff' },
    TYPE: { mass: 2, shape: 'dot', color: 'darkslateblue' },
    TTYP: { mass: 2, shape: 'dot', color: 'coral' },
    TABL: { mass: 1, shape: 'dot', color: 'white', x: -10000, y: -10000 },
    TRAN: { mass: 5, shape: 'box', color: 'grey', font: { color:'white' }, x: 1000, y: -1000 },
    VIEW: { mass: 1, shape: 'dot', color: 'yellow' }
  },
  ...vo
}

function App() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const networkRef = useRef()
  const searchRef = useRef()
  const allHideRef = useRef([])
  const highlightsRef = useRef([])

  useEffect(() => {
    const q = localStorage.getItem('search')
    if (q && searchRef.current) {
      searchRef.current.value = q
      searchRef.current.setAttribute('value', q)
      search(q)
    }
  }, [])

  const handleSearchChange = e => {
    const q = e.target.value
    if (e.which === 13 || q.length === 0) {
      localStorage.setItem('search', q)
      search(q)
    }
  }

  const search = q => {
    queryGraph(driver, 'zresource').then(({ nodes, edges }) => {
      const nodesUpdate = nodes.map((node, ind) => 
        ind !== 0 ? 
        { 
          ...node, 
          hidden: true,
          color: node.group === 'PROG' ? 'red' : visOptions.groups[node.group].color,
          label: node.title ? `${node.label} \n ${node.title}` : node.label,
          title: undefined,
          // x: visOptions.groups[node.group].x ? visOptions.groups[node.group].x : undefined,
          // y: visOptions.groups[node.group].y ? visOptions.groups[node.group].y : undefined
        } 
        : 
        {
          ...node,
          label: node.title ? `${node.label} \n ${node.title}` : node.label,
          title: undefined,
          borderWidth: 5,
          size: 35,
          color: {
            background:'#4CAF50', 
            hover:'#3e8e41', 
            border: "green", 
            highlight: {
              border: '#3e8e41', 
              background: 'green'
            }
          },
          fixed: {
            x: true,
            y: true
          }
        }
      )
      setNodes(nodesUpdate)
      setEdges(edges)
    })
  }

  const handleFitWindow = () => {
    setTimeout(() => {
      networkRef.current && networkRef.current.fit({ animation: true })
    }, 1000);
  }

  const handleSaveClick = nodeId => () => {
    const dump = fp.compose(
      fp.map(dumpEdge),
      fp.get('edges'),
      fpIterateFrom(),
      fp.get(`body.nodes[${nodeId}]`)
    )(networkRef.current)
    csvExport('objectRelationships.csv', dump)
  }

  const handleHideClick = nodeId => () => {
    const descendants = fp.compose(
      fp.map(node => node.id),
      fp.get('nodes'),
      fpIterateFrom({ self: false }),
      fp.get(`body.nodes[${nodeId}]`)
    )(networkRef.current)
    const hidden = allHideRef.current.includes(nodeId)
    const update = nodes.map(node => descendants.includes(node.id) ? { ...node, hidden } : node )
    allHideRef.current = xor(allHideRef.current, [nodeId])
    setNodes(update)
    handleFitWindow()
  }

  const handleOpenDirect = (nodeId, expand) => () => {
    const descendants = fp.compose(
      fp.map(node => node.id),
      fp.get('nodes'),
      fpIterateFrom({ self: false, direct: expand }),
      fp.get(`body.nodes[${nodeId}]`)
    )(networkRef.current)
    const update = nodes.map(node => descendants.includes(node.id) ? { ...node, hidden: !expand } : node )
    setNodes(update)
    handleFitWindow()
  }

  const popups = {
    // popupOnEdgeClick: e => (
    //   <div className='edge-popup'>{e.edges[0]}</div>
    // ),
    popupOnNodeHover: e => {
      const node = networkRef.current.body.nodes[e.node]
      const ids = node.edges.filter(({ from }) => from === node).map(edge => edge.to.id)
      const outgoings = nodes.filter(node => ids.includes(node.id))
      const expand = outgoings.every(node => node.hidden)
      const hide = allHideRef.current.includes(e.node)

      return (
        <div className='hover-popup' style={{marginLeft: `${node.shape.width / 2 + 20}px`}}>
          <FontAwesomeIcon
            icon={faSave}
            title='Save'
            onClick={handleSaveClick(e.node)}
            size="lg"
          />
          <FontAwesomeIcon
            icon={!hide ? faEye :faEyeSlash}
            title='Hide/Unhide Descendants'
            onClick={handleHideClick(e.node)}
            size="lg"
          />

          {!!outgoings.length && (
            <FontAwesomeIcon
              icon={expand ? faAngleRight : faAngleLeft}
              title='Open/Close the Direct Children'
              onClick={handleOpenDirect(e.node, expand)}
              size="lg"
            />
          )}

          {!!outgoings.length && (
            <FontAwesomeIcon
              icon={ faAngleDoubleRight }
              title='Open/Close the Direct Children'
              size="lg"
              // onDoubleClick={handleHideClick(e.node)}
            />
          )}
        </div>
      )
    }
  }

  const options = {
    height: '500px',
    toolbar: true,
    extendLegend: [{
      label: 'Highlights',
      items: [
        {
          label: 'System Object',
          onClick: () => {
            setNodes(nodes => {
              if (highlightsRef.current.includes('system')) {
                return nodes.map(node => node.isCustom ? node : {
                  ...node,
                  borderWidth: 0,
                  color: { border: null }
                })
              } else {
                return nodes.map(node => node.isCustom ? node : {
                  ...node,
                  ...styles.highlight
                })
              }
            })
            highlightsRef.current = xor(highlightsRef.current, ['system'])
          }
        }
      ]
    }]
  }

  const events = {
    click: () => console.log('hihi'),
    dragStart: e => {
      if (!e.nodes.length) {
        return
      }
      const node = networkRef.current.body.nodes[e.nodes[0]]
      node.options.fixed.y = false
      node.options.fixed.x = false

      e.edges.forEach(edge => {
        networkRef.current.body.edges[edge].options.color.hover="blue"
        networkRef.current.body.edges[edge].options.color.highlight="blue"
      })
    },
    dragEnd: e => {
      if (!e.nodes.length) {
        return
      }
      const node = networkRef.current.body.nodes[e.nodes[0]]
      node.options.fixed.y = true
      node.options.fixed.x = true

      e.edges.forEach(edge => {
        networkRef.current.body.edges[edge].options.color.hover="red"
        networkRef.current.body.edges[edge].options.color.highlight="red"
      })
    },
    stabilizationIterationsDone: () => {
      const network = networkRef.current
      network.moveTo({
        position : {
          x : 0,
          y : 0
         },
      });
      network.setOptions({
        physics : {
          enabled : true,
          stabilization : {
            fit : true,
            enabled : true,
          }
        }
      });
      setTimeout(() => {
        network.fit({ animation: true });
      }, 10);
    }
  }

  const getNetwork = network => networkRef.current = network

  return (
    <div className='App'>
      <input
        ref={searchRef}
        onKeyUp={handleSearchChange}
        placeholder='Search the codebase'
        className='SearchCodebase'
      />
      {nodes.length && edges.length && (
        <Graph
          className='ProfileGraph'
          visOptions={visOptions}
          nodes={nodes}
          edges={edges}
          events={events}
          popups={popups}
          options={options}
          getNetwork={getNetwork}
        />
      )}
    </div>
  );
}

export default App;
