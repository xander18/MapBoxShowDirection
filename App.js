/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  StatusBar,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapboxGL, { Camera } from '@react-native-mapbox-gl/maps';
import {lineString as makeLineString} from '@turf/helpers';
import MapboxDirectionsFactory from '@mapbox/mapbox-sdk/services/directions';

import PulseCircleLayer from './PulseCircleLayer';
import RouteSimulator from './RouteSimulator';
import CenteringButtonMap from './CenteringButtonMap';

const accessToken = 'YOUR_ACCESS_TOKEN';
const directionsClient = MapboxDirectionsFactory({accessToken});

Icon.loadFont();
MapboxGL.setAccessToken(accessToken);

// user center coordinate
const UserLocation = []; // [longitude, latitude]
const StartLocation = UserLocation;
const DestinationLocation = []; //

const App: () => React$Node = () => {
  let [userLocation, setUserLocation] = useState(UserLocation);
  let [route, setRoute] = useState(null);
  let [currentPoint, setCurrentPoint] = useState(null);
  let [routeSimulator, setRouteSimulator] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      const reqOptions = {
        waypoints: [
          {coordinates: StartLocation},
          {coordinates: DestinationLocation},
        ],
        profile: 'walking',
        geometries: 'geojson',
      };
      const res = await directionsClient.getDirections(reqOptions).send();
      const newRoute = makeLineString(res.body.routes[0].geometry.coordinates);
      setRoute(newRoute);
    };
    fetchRoute();
    if (routeSimulator) {
      return routeSimulator.stop();
    }
  }, [routeSimulator]);

  // Action to center the map on user position
  const centeringButtonPress = () => {
    _camera.flyTo(userLocation, 1500);
    _camera.zoomTo(14);
  };

  // Update userposition on update location
  const onUserLocationUpdate = newUserLocation => {
    setUserLocation([
      newUserLocation.coords.longitude,
      newUserLocation.coords.latitude,
    ]);
  };

  // Simulate the path to follow
  const onStart = () => {
    const newRouteSimulator = new RouteSimulator(route);
    newRouteSimulator.addListener(points => setCurrentPoint(points));
    newRouteSimulator.start();
    setRouteSimulator(newRouteSimulator);
  };

  // Render progressive Line
  const renderProgressLine = () => {
    if (!currentPoint) {
      return null;
    }

    const {nearestIndex} = currentPoint.properties;
    const coords = route.geometry.coordinates.filter(
      (c, i) => i <= nearestIndex,
    );
    coords.push(currentPoint.geometry.coordinates);

    if (coords.length < 2) {
      return null;
    }

    const lineString = makeLineString(coords);
    return (
      <MapboxGL.Animated.ShapeSource id="progressSource" shape={lineString}>
        <MapboxGL.Animated.LineLayer
          id="progressFill"
          style={layerStyles.progress}
          aboveLayerID="routeFill"
        />
      </MapboxGL.Animated.ShapeSource>
    );
  };

  // Render the point that follow the path
  const renderCurrentPoint = () => {
    if (!currentPoint) {
      return;
    }
    return (
      <PulseCircleLayer
        shape={currentPoint}
        aboveLayerID="destinationInnerCircle"
      />
    );
  };

  // render the Route
  const renderRoute = () => {
    return route ? (
      <MapboxGL.ShapeSource id="routeSource" shape={route}>
        <MapboxGL.LineLayer id="routeFill" style={layerStyles.route} />
      </MapboxGL.ShapeSource>
    ) : null;
  };

  // Start Button
  const renderActions = () => {
    return !routeSimulator ? (
      <View style={styles.startRouteButton}>
        <Text style={styles.text} onPress={() => onStart()}>
          Start Direction
        </Text>
      </View>
    ) : null;
  };

  // start point
  const renderOrigin = () => {
    let backgroundColor = 'white';

    if (currentPoint) {
      backgroundColor = '#1D1D1D';
    }

    const style = [layerStyles.origin, {circleColor: backgroundColor}];

    return (
      <MapboxGL.ShapeSource
        id="origin"
        shape={MapboxGL.geoUtils.makePoint(DestinationLocation)}>
        <MapboxGL.Animated.CircleLayer id="originInnerCircle" style={style} />
      </MapboxGL.ShapeSource>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.flex}>
          <MapboxGL.MapView
            logoEnabled={false}
            styleURL={MapboxGL.StyleURL.Light}
            zoomLevel={14}
            centerCoordinate={UserLocation}
            style={styles.flex}>
            <CenteringButtonMap onPress={() => centeringButtonPress()} />
            <MapboxGL.Camera
              zoomLevel={14}
              centerCoordinate={userLocation}
              ref={camera => (_camera = camera)}
            />
            <MapboxGL.UserLocation
              visible={true}
              onUpdate={newUserLocation =>
                onUserLocationUpdate(newUserLocation)
              }
            />
            {renderActions()}
            {renderOrigin()}
            {renderRoute()}
            {renderCurrentPoint()}
            {renderProgressLine()}
            <MapboxGL.ShapeSource
              id="destination"
              shape={MapboxGL.geoUtils.makePoint(DestinationLocation)}>
              <MapboxGL.CircleLayer
                id="destinationInnerCircle"
                style={layerStyles.destination}
              />
            </MapboxGL.ShapeSource>
          </MapboxGL.MapView>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  startRouteButton: {
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    right: 10,
    top: 20,
  },
  text: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },
});

const layerStyles = {
  origin: {
    circleRadius: 5,
    circleColor: 'white',
  },
  destination: {
    circleRadius: 5,
    circleColor: 'red',
  },
  route: {
    lineColor: '#1D1D1D',
    lineCap: MapboxGL.LineJoin.Round,
    lineWidth: 3,
    lineOpacity: 0.84,
  },
  progress: {
    lineColor: '#1D1D1D',
    lineWidth: 3,
  },
};

export default App;
