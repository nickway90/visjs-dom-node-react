export const dumpEdge = edge => {
  const from = edge.from.options
  const to = edge.to.options

  return {
    fromType: from.group,
    fromTechnicalname: from.technicalName,
    fromDisplayName: from.label,
    fromDescription: from.title,
    relationship: edge.options.type,
    toType: to.group,
    toTechnicalname: to.technicalName,
    toDisplayName: to.label,
    toDescription: to.title
  }
}
