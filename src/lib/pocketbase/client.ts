import PocketBase from 'pocketbase'

const url = import.meta.env.VITE_POCKETBASE_URL
const pb = new PocketBase(url?.endsWith('/') ? url.slice(0, -1) : url)
pb.autoCancellation(false)

export default pb
