import uniqBy from 'lodash/uniqBy'

export default (driver, label) => {
	const nodes = []
	const edges = []

	if (!label) {
		return Promise.resolve({ nodes, edges })
	}

  const query =
    `MATCH (a {label: '${label.toUpperCase()}'})-[path:USES*]->(b)
    UNWIND path as p
    WITH p, startNode(p) as start, endNode(p) as end
    return distinct {
      from: {group: start.group, id: id(start), isCustom: start.isCustom, label: start.displayName, title: start.description, technicalName: start.label}, 
      to: {group: end.group, id: id(end), isCustom: end.isCustom, label: end.displayName, title: end.description, technicalName: end.label}, 
      edge: {id: id(start) + '-' + id(end), from: id(start), to: id(end), label: p.type}
		} as link`
		
	return fetchData(driver, query).then(results => {
		results.forEach(r => {
			const { from, to, edge } = r.link;
			nodes.push(from)
			nodes.push(to)
			edges.push(edge)
		})

		return {
			nodes: uniqBy(nodes, 'id').map((x) => {
				if (x.title === null) {
					x.title = undefined
				}
				return x
			}),
			edges: uniqBy(edges, 'id')
		}
	})
}

const fetchData = (driver, query) =>
	runQuery(driver, query).then(result => {
		return result.records.map(record => {
			const obj = {}
			record.forEach((v, k, r) => {
				if (v === null) {
					obj[k] = null
				} else if (v.constructor.name === 'Node') {
					obj[k] = v.properties
				} else if (typeof v === 'object' && v.constructor.name === 'Integer') {
					obj[k] = v.toNumber()
				} else {
					obj[k] = v
				}
			})
			
			return obj;
		})
	})

const runQuery = (driver, query) => {
	const session = driver.session()
	return session.run(query).then(result => {
		session.close()
		return result
	}).catch(error => {
		console.log(error)
		return error
	})
}
