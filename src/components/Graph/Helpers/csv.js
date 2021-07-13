import FileSaver from 'file-saver'

export function csvExport(fileName, data, delimiter = ',') {
	if (!data.length) {
		alert('No data to download')
		return
	}

	const headers = Object.keys(data[0])
	const body = data.map(row => row ? headers.map(header => row[header] || '').join(delimiter) : '')
	const content = [headers.join(delimiter)].concat(body).join('\r\n')
	const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })

	FileSaver.saveAs(blob, fileName)
}
