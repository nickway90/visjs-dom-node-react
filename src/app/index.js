import React, { useEffect, useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faEye, faEyeSlash, faAngleRight, faAngleLeft, faAngleDoubleRight, faInfo } from '@fortawesome/free-solid-svg-icons'
import fp from 'lodash/fp'
import xor from 'lodash/xor'
import Graph, { iterateFrom, csvExport, dumpEdge, styles } from 'components/Graph'
import vo from './vis-options'
import neo4j from 'neo4j-driver'
import mockDriver from './mock-driver'
import queryGraph from 'neo4j'
import './style.scss'
import Tooltip from 'react-tooltip-lite';

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
    PROG: { mass: 1, shape: 'dot', wind: { x: 0, y: -1000 } },
    FUNC: { mass: 1, shape: 'dot', color: '#f5ab70' },
    METH: { mass: 1, shape: 'dot', color: '#059494' },
    DTEL: { mass: 2, shape: 'dot', color: '#059494' },
    STRU: { mass: 2, shape: 'dot', color: '#00b8ff' },
    TYPE: { mass: 2, shape: 'dot', color: '#483d8b' },
    TTYP: { mass: 2, shape: 'dot', color: '#ff7f50' },
    TABL: { mass: 1, shape: 'dot', color: '#ffffff', wind: { x: -1000, y: -1000 } },
    TRAN: { mass: 5, shape: 'box', color: '#808080', font: { color:'white' }, wind: { x: 1000, y: -1000 } },
    VIEW: { mass: 1, shape: 'dot', color: '#ffff00' }
  },
  ...vo
}

function App() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [rootNodeId, setRootNodeId] = useState(null)
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
          color: node.group === 'PROG' ? '#ff0000' : visOptions.groups[node.group].color,
          title: undefined,
          tooltip: {
            label: node.label ? node.label : '',
            description: node.title ? node.title : ''
          },
          // x: visOptions.groups[node.group].x ? visOptions.groups[node.group].x : undefined,
          // y: visOptions.groups[node.group].y ? visOptions.groups[node.group].y : undefined
        } 
        : 
        {
          ...node,
          title: undefined,
          tooltip: {
            label: node.label ? node.label : '',
            description: node.title ? node.title : ''
          },
          borderWidth: 5,
          size: 35,
          color: {
            background:'#4CAF50', 
            hover:'#3e8e41', 
            border: "#008000", 
            highlight: {
              border: '#3e8e41', 
              background: '#008000'
            }
          },
          fixed: {
            x: true,
            y: true
          }
        }
      )
      allHideRef.current = [nodes[0].id]
      setRootNodeId(nodes[0].id)
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
      fpIterateFrom({ self: nodeId === rootNodeId ? false : true }),
      fp.get(`body.nodes[${nodeId}]`)
    )(networkRef.current)
    const hidden = !allHideRef.current.includes(nodeId)
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

      let tooltip_content = ''
      for(const [key, value] of Object.entries(node.options.tooltip)) {
        tooltip_content += `${key}: ${value} \n`
      }
      
      return (
        <div className='hover-popup' style={{marginLeft: `${node.shape.width / 2 + 20}px`}}>
          <FontAwesomeIcon
            icon={faSave}
            title='Save'
            onClick={handleSaveClick(e.node)}
            size="lg"
          />
          <FontAwesomeIcon
            icon={hide ? faEye :faEyeSlash}
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

          <Tooltip 
            content={tooltip_content}
            className="target"
            tipContentClassName=""
            tagName="p"
            eventOn="onClick"
            eventOff="onMouseOut"
            useHover={false}
          >
            <FontAwesomeIcon
              icon={ faInfo }
              title='Info'
              size="lg"
            />
          </Tooltip>
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
      if (e.nodes[0] === rootNodeId) {
        node.options.fixed.y = true
        node.options.fixed.x = true
      } else {
        node.options.fixed.y = false
        node.options.fixed.x = false
      }
      

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
    selectNode: e => {
      const node = networkRef.current.body.nodes[e.nodes[0]]
      console.log(allHideRef)
      node.options.borderWidth = 0
    },
    hoverNode: e => {
      const descendants = fp.compose(
        fp.map(node => node.id),
        fp.get('nodes'),
        fpIterateFrom({ self: true }),
        fp.get(`body.nodes[${e.node}]`)
      )(networkRef.current)
      const update = nodes.map(node => descendants.includes(node.id) ? node : { ...node, opacity: 0.1 } )
      setNodes(update)
    },
    blurNode: e => {
      setNodes(nodes => {
        return nodes.map(node =>{
          return {
            ...node,
            opacity: 1
          }
        })
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
          handleShowNode={handleHideClick}
          allHideRef={allHideRef}
        />
      )}
    </div>
  );
}

export default App;
