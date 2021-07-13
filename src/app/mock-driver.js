import data from 'data/query-mock.json';

const run = () => new Promise(resolve => resolve({
  records: data.map(d => {
    const map = []
    Object.keys(d).forEach(k => map.push([k, d[k]]))
    return new Map(map)
  })
}))

export default {
  session: () => ({
    run,
    close: () => {}
  })
}
