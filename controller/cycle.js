const Cycle = require('../models/cycle');
const User=require('../models/user');
const overall=require('../models/overallStatus');
const History = require("../models/history");

async function showCycle(req, res){
    try {
      // Fetch all cycles associated with the logged-in user
      const cycles = await Cycle.find({ userId: req.user._id });
      console.log('Cycles fetched:', { cycles: cycles });
  
  
      // Render the EJS template with the cycles data
      if (cycles != null) {
        res.render('cycle', { cycles }); // Ensure cycles is passed here
  
      }
      else {
        res.send("No cycles");
      }
  
  
    } catch (error) {
      console.error('Error fetching cycles:', error);
      res.status(500).json({ message: 'Error fetching cycles', error });
    }
  }

async function addCycle (req, res){
    try {
      const { name } = req.body;
      if (!req.user || !req.user._id) {
        res.status(400).json({ message: "User not authenticated or missing ID" });
      }
      const c = await Cycle.findOne({ name: name });
      if (c == null) {
        const cycle = await Cycle.create({
          name: name,
          userId: req.user._id,
        })
        res.redirect('/api/cycle')
      }
      else {
        throw error;
      }
    }
    catch {
      res.status(400).json({ message: "couldn't add cycle!Name might already taken, Try changing the name" })
    }
}

async function handleLocationSentByWokwi (req, res){
    try {
      console.log('Received GPS data:', req.body);
  
      const { latitude, longitude, id } = req.body;
  
      const user1=await User.findById(id);
      const lat=user1.lat;
      const long= user1.long;
  
      if (!isNaN(latitude) && !isNaN(longitude)) {
        const latitudeFloat = parseFloat(latitude);
        const longitudeFloat = parseFloat(longitude);
  
        console.log(`Latitude: ${latitudeFloat}, Longitude: ${longitudeFloat}`);
  
        const distanceSquared = calculateDistance(lat,long,latitudeFloat,longitudeFloat);
        console.log(distanceSquared);
        if (distanceSquared > 500) {
  
          await overall.findByIdAndUpdate('672265055d938eaea9d99fd9', { openLock: 0, buzz: 1 });
        } else {
          await overall.findByIdAndUpdate('672265055d938eaea9d99fd9', { openLock: 1, buzz: 0 });
        }
  
        res.status(200).json({
          message: 'Location data received successfully!',
          receivedData: req.body,
        });
      } else {
        res.status(400).json({ message: 'Invalid GPS data received. Latitude and Longitude should be numbers.' });
      }
    } catch (error) {
      console.error('Error handling GPS data:', error);
      res.status(500).json({ message: 'Internal server error while processing GPS data.', error: error.message });
    }
}

async function lockMyCycle (req, res){
    // sendsSignaltoController()
    try {
      const { cycleId } = req.body;
  
      // Find the cycle by its ID and userId
      const cycle = await Cycle.findOne({ _id: cycleId, userId: req.user._id });
  
      if (!cycle) {
        return res.status(404).json({ message: 'Cycle not found' });
      }
      if (cycle.status === 'locked') {
        return res.status(400).json({ message: 'Cycle is already locked' });
      }
  
      cycle.status = 'locked';
      await cycle.save();
      // Write the updated object back to the JSON file
      await overall.findByIdAndUpdate('672265055d938eaea9d99fd9', { openLock: 0 });
  
      await History.create({
        userId: req.user._id,
        action: `locked`,
        name: cycle.name
      });
  
      res.status(200).json({ message: `Cycle "${cycle.name}" locked successfully` });
    } catch (error) {
      console.error('Error locking cycle:', error);
      res.status(500).json({ message: 'Error locking cycle', error });
    }
}

async function unlockMyCycle(req, res){
    // sendUnlockSignaltoController();
    try {
      const { cycleId } = req.body;
  
      const cycle = await Cycle.findOne({ _id: cycleId, userId: req.user._id });
  
      if (!cycle) {
        return res.status(404).json({ message: 'Cycle not found' });
      }
  
  
      if (cycle.status === 'unlocked') {
        return res.status(400).json({ message: 'Cycle is already unlocked' });
      }
  
      cycle.status = 'unlocked';
      await cycle.save();
  
      await overall.findByIdAndUpdate('672265055d938eaea9d99fd9', { openLock: 1 });
  
      await History.create({
        userId: req.user._id,
        name: cycle.name,
        action: `unlocked`,
      });
  
      res.status(200).json({ message: `Cycle "${cycle.name}" unlocked successfully` });
    } catch (error) {
      console.error('Error unlocking cycle:', error);
      res.status(500).json({ message: 'Error unlocking cycle', error });
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371e3; // Radius of the Earth in meters
    var φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    var φ2 = lat2 * Math.PI / 180;
    var Δφ = (lat2 - lat1) * Math.PI / 180;
    var Δλ = (lon2 - lon1) * Math.PI / 180;
  
    var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    var distance = R * c; // in meters
    return distance;
  }

module.exports={
    showCycle,
    addCycle,
    handleLocationSentByWokwi,
    lockMyCycle,
    unlockMyCycle,
    calculateDistance
}