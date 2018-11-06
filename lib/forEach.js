module.exports = async (iterable, callback) => {
  for (const element of iterable) {
    await callback(element)
  }
}
