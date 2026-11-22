import api from './client'
export default { list(params={}) { return api.get('/provider/crm/customers',{params}) }, show(id) { return api.get('/provider/crm/customers/'+id) } }
