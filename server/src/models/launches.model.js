const axios = require('axios')

const launches = require('./launches.mongo')
const planets = require('./planets.mongo')

const DEFAULT_FLIGHT_NUMBER = 100

const launch = {
  flightNumber: 100, //flight_number
  mission: 'Kepler Exploration X', //name
  rocket: 'Explorer IS1', //rocket.name
  launchDate: new Date('December 27, 2030'), //data_local
  target: 'Kepler-442 b', //not applicable
  customers: ['ZTM', 'NASA'], //payload.customers forEach payload
  upcoming: true, //upcoming
  success: true, //success
}

saveLaunch(launch)

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query'

async function loadLauchesData() {
  console.log('Downloading launch data...')
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      pagination: false,
      populate: [
        {
          path: 'rocket',
          select: {
            name: 1,
          },
        },
        {
          path: 'payloads',
          select: {
            customers: 1,
          },
        },
      ],
    },
  })
}

async function existsLaunchWithId(launchId) {
  return await launches.findOne({
    flightNumber: launchId,
  })
}

async function getLatestFlightNumber() {
  // in desc order
  const lastestLaunch = await launches.findOne().sort('-flightNumber')

  if (!lastestLaunch) {
    return DEFAULT_FLIGHT_NUMBER
  }
  return lastestLaunch.flightNumber
}

async function getAllLaunches() {
  return await launches.find({}, { _id: 0, __v: 0 })
}

async function saveLaunch(launch) {
  const planet = await planets.findOne({
    keplerName: launch.target,
  })

  if (!planet) {
    throw new Error('No matching planet found')
  }

  await launches.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    {
      upsert: true,
    }
  )
}

async function scheduleNewLaunch(launch) {
  const newFlightNumber = (await getLatestFlightNumber()) + 1
  const newLaunch = Object.assign(launch, {
    success: true,
    upcoming: true,
    customers: ['Zero to Mastery', 'NASA'],
    flightNumber: newFlightNumber,
  })

  await saveLaunch(newLaunch)
}

async function abortLaunchById(launchId) {
  const aborted = await launches.updateOne(
    {
      flightNumber: launchId,
    },
    {
      upcoming: false,
      success: false,
    }
  )

  return aborted.modifiedCount === 1
}

module.exports = {
  existsLaunchWithId,
  getAllLaunches,
  scheduleNewLaunch,
  abortLaunchById,
}
