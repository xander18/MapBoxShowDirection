/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapboxGL, { Camera } from '@react-native-mapbox-gl/maps';
import {lineString as makeLineString} from '@turf/helpers';
import MapboxDirectionsFactory from '@mapbox/mapbox-sdk/services/directions';

import PulseCircleLayer from './PulseCircleLayer';
import CenteringButtonMap from './CenteringButtonMap';

const accessToken = 'YOUR-MAPBOX-KEY';
const directionsClient = MapboxDirectionsFactory({accessToken});

Icon.loadFont();
MapboxGL.setAccessToken(accessToken);

// Coordinates
const UserLocation = [2.374400000000037, 48.9052]; // [longitude, latitude]
const DestinationLocation = [2.3488, 48.8534]; // [longitude, latitude]
const StartLocation = UserLocation;
const CenterCoordinate = UserLocation;

export default class AppClass extends Component {
  state = {
    userLocation: UserLocation,
    route: null,
    started: false,
    loading: false
  };

  drawPath() {
    const fetchRoute = async () => {
      console.log('fetch route');
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
      this.setState({
        ...this.state,
        route: newRoute
      });
    };
    this.state.started && fetchRoute();
  }

  centeringButtonPress() {
    this._camera.flyTo(this.state.userLocation, 1500);
    this._camera.zoomTo(14);
  };

  // Update userposition on update location
  onUserLocationUpdate(newUserLocation) {
    this.setState({
      ...this.state,
      userLocation: [
        newUserLocation.coords.longitude,
        newUserLocation.coords.latitude,
      ]
    });
  };

  onStart() {
    this.setState({
      ...this.state,
      started: true
    }, () => this.drawPath());
  };

  onStop() {
    this.setState({
      ...this.state,
      route: null,
      started: null
    });
  };


  renderDestinationPoint() {
    return DestinationLocation && DestinationLocation.length > 0 && this.state.started ? (
      <MapboxGL.PointAnnotation
        id="destination"
        title="destination location"
        coordinate={DestinationLocation}>
        <View style={styles.circle}>
          <View style={styles.innerCircle}>
            <View style={styles.dotCircle} />
          </View>
        </View>
      </MapboxGL.PointAnnotation>
    ) : null;
  };

  renderStart() {
    return StartLocation.length > 0 && this.state.started ? (
      <MapboxGL.PointAnnotation
        id="start"
        title="start location"
        coordinate={StartLocation}>
        <View style={styles.circle}>
          <View style={styles.innerCircle}>
            <View style={styles.dotCircle} />
          </View>
        </View>
      </MapboxGL.PointAnnotation>
    ) : null;
  };

  renderRoute() {
    return this.state.route ? (
      <MapboxGL.ShapeSource id = "routeSource" shape={this.state.route}>
        <MapboxGL.LineLayer id="routeFill" style={layerStyles.route} />
      </MapboxGL.ShapeSource>
    ) : null;
  };

  renderActions() {
    return (
      <TouchableOpacity
        style={styles.startRouteButton}
        onPress={() => !this.state.started ? this.onStart() : this.onStop()}>
        <Text style={styles.text}>
          {!this.state.started ? 'Start' : 'Stop'}
        </Text>
      </TouchableOpacity>
    );
  };

  render() {
    return (
      <>
        {this.state.loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.container}>
          <View style={styles.flex}>
            <MapboxGL.MapView
              logoEnabled={false}
              compassEnabled={false}
              zoomEnabled={true}
              onDidFinishRenderingMapFully={() => this.setState({...this.state, loading: false})}
              zoomLevel={14}
              style={styles.flex}>
              <MapboxGL.Camera
                zoomLevel={14}
                animationMode="flyTo"
                animationDuration={0}
                centerCoordinate={CenterCoordinate}
                followUserLocation={false}
                defaultSettings={{
                  centerCoordinate: CenterCoordinate,
                  followUserLocation: false,
                  followUserMode: 'normal',
                }}
                ref={camera => (_camera = camera)}
              />
              <MapboxGL.UserLocation
                visible={true}
                onUpdate={newUserLocation =>
                  this.onUserLocationUpdate(newUserLocation)
                }
              />
              {this.renderRoute()}
              {this.renderDestinationPoint()}
              {this.renderStart()}
            </MapboxGL.MapView>
            {this.renderActions()}
            <CenteringButtonMap onPress={() => this.centeringButtonPress()} />
          </View>
        </SafeAreaView>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0, .5)',
    height: '100%',
    width: '100%',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startRouteButton: {
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    right: 10,
    top: 20,
    width: 100,
    height: 100,
    zIndex: 200,
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
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(68, 154, 235, .4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1D1D1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(68, 154, 235, 1)',
  },
});

const layerStyles = {
  route: {
    lineColor: '#1D1D1D',
    lineCap: MapboxGL.LineJoin.Round,
    lineWidth: 3,
    lineOpacity: 0.84,
  },
};
