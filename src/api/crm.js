import api from './client'
export default { list(params={}) { return api.get('/provider/crm/customers',{params}) }, show(id) { return api.get('/provider/crm/customers/'+id) },
  suggestions(days=30) { return api.get('/provider/crm/retention/suggestions',{params:{days}}) },
  tasks(params={}) { return api.get('/provider/crm/retention/tasks',{params}) },
  createTask(payload) { return api.post('/provider/crm/retention/tasks',payload) },
  updateTask(id,status) { return api.patch('/provider/crm/retention/tasks/'+id,{status}) },
  updateBirthday(id,birthday) { return api.patch('/provider/crm/customers/'+id+'/birthday',{birthday}) } }
