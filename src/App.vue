<template>
  <a-layout class="layout">
    <a-layout-header class="header">
      <img :src="`${publicPath}logo.png`">
    </a-layout-header>
    <a-layout-content class="content">
      <div
        ref="map"
        class="maps"
      />
      <div class="hover">
        <a-card
          v-if="selectedStation"
          :loading="loading"
        >
          <h3 slot="title">
            {{ `Estación ${selectedStation}` }},
            <span class="time">{{ (predictData.date || defaultDate) | moment("calendar") }}</span>
            <span class="selector-hours">
              <a-button
                type="primary"
                :disabled="hours <= 0"
                shape="round"
                icon="minus"
                size="small"
                @click="updateTimer('minus')"
              />
              <a-button
                type="primary"
                shape="round"
                icon="plus"
                size="small"
                @click="updateTimer('plus')"
              />
            </span>
          </h3>
          <a
            slot="extra"
            @click="clearSelection"
          ><a-icon type="close"/></a>
          <a-row :gutter="16">
            <a-col>
              <a-statistic
                title="Disponibilidad (Aprox.)"
                :value="predictData.available"
                value-class="demo-class"
              >
                <template v-slot:prefix>
                  <a-icon
                    v-if="predictData.perc > 0.2"
                    type="like"
                    :style="{color: '#31AFB4'}"
                  />
                  <a-icon
                    v-else-if="predictData.perc > 0"
                    type="alert"
                    :style="{color: 'rgb(233, 105, 0)'}"
                  />
                  <a-icon
                    v-else
                    type="stop"
                    :style="{color: '#e62d2d'}"
                  />
                </template>
                <template v-slot:suffix>
                  <span> / {{ predictData.total }}</span>
                </template>
              </a-statistic>
            </a-col>
          </a-row>
        </a-card>
      </div>
    </a-layout-content>
  </a-layout>
  <!-- <div class="wrapper">
    <div class="maps" ref="map"></div>
    <div class="buttons">
      <button v-if="selectedMarker" @click="updateMarker('minus')">
        - 1 hora
      </button>
      <button v-if="selectedMarker" @click="updateMarker('plus')">
        + 1 hora
      </button>
    </div>
    <div class="predictionWrapper">
      <h1 v-if="predictionMessage" class="prediction">
        {{ predictionMessage }}
      </h1>
    </div>
  </div>-->
</template>

<script>
import MarkerClusterer from "@google/markerclusterer";
import Geohash from "ngeohash";
import axios from "axios";
import gmapsInit from "./utils/gmaps";

// eslint-disable-next-line import/first

export default {
  name: `App`,
  data() {
    return {
      publicPath: process.env.BASE_URL,

      show: false,
      loading: false,
      selectedStation: false,
      selectedMarker: null,

      hours: 0,
      defaultDate: new Date(),
      predictData: {},

      // Por defecto centro de Valencia
      center: { lat: 39.475674, lng: -0.373764 },

      markers: [],
      stations: [],
      locations: [],
      // currentPlace: null,
      selectedMarkerTimer: new Date(),
      predictionMessage: null,
    };
  },
  watch: {
    // whenever question changes, this function will run
    locations() {},
  },
  async mounted() {
    try {
      const google = await gmapsInit();
      const geocoder = new google.maps.Geocoder();
      const map = new google.maps.Map(this.$refs.map, {
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT,
        },
      });
      this.map = map;
      await this.geolocate();

      geocoder.geocode(
        { placeId: `ChIJb7Dv8ExPYA0ROR1_HwFRo7Q` },
        (results, status) => {
          if (status !== `OK` || !results[0]) {
            throw new Error(status);
          }

          map.setCenter(results[0].geometry.location);
          map.fitBounds(results[0].geometry.viewport);
        },
      );

      this.setMarkers(map);
    } catch (error) {
      this.$message.error(error);
    }
  },

  methods: {
    geolocate() {
      const auth = {
        headers: {
          Authorization: `Basic dmFsZW5iaXNpOlNhdHVyZGF5U0AjMTIzNDU=`,
          crossorigin: `anonymous`,
          integrity: `sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=`,
        },
      };

      const encodedLocation = Geohash.encode(this.center.lat, this.center.lng);
      // const encodedLocation = Geohash.encode(39.475674, -0.373764);

      axios
        .get(
          `http://34.66.227.237:8080/api/stations/search/nearby?size=300&geohash=${
            encodedLocation.substring(0, 4)}`,
          auth,
        )
        .then((response) => {
          // eslint-disable-next-line no-underscore-dangle
          this.stations = response.data._embedded.stations;

          this.stations.forEach((station) => {
            const currentStation = {
              position: {
                lat: station.location.latitude,
                lng: station.location.longitude,
              },
              number: station.number,
              stationServiceStatus: station.stationServiceStatus,
            };

            this.locations.push(currentStation);
          });
          this.map.setZoom(13);
          this.map.setCenter(this.center);
          this.setMarkers(this.map);
        })
        .catch((error) => {
          this.$message.error(error);
        });

      return this.locations;
    },

    clearSelection() {
      this.selectedStation = null;
      this.selectedMarker = null;
    },

    markerClickHandler(map, marker) {
      map.setZoom(17);
      map.setCenter(marker.getPosition());
      this.selectedStation = marker.number;
      this.selectedMarker = marker;
      this.updateMarker(marker);
    },

    updateMarker() {
      this.loading = true;

      if (this.hours > 0) {
        const auth = {
          headers: {
            Authorization: `Basic dmFsZW5iaXNpOlNhdHVyZGF5U0AjMTIzNDU=`,
            crossorigin: `anonymous`,
            integrity: `sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=`,
          },
        };

        axios
          .get(
            `http://34.66.227.237:5000/api/prediction?station=${
              this.selectedStation
            }&hours=${this.hours - 1}&date=${this.$moment(this.defaultDate).format(`YYYY-MM-DDTHH:mm:ss`)}`,
            auth,
          )
          .then((response) => {
            this.loading = false;
            this.predictData = response.data;
          })
          .catch((error) => {
            this.$message.error(error);
          });
      } else {
        this.loading = false;
        this.predictData = {
          date: this.defaultDate,
          available: this.selectedMarker.stationServiceStatus.available,
          total: this.selectedMarker.stationServiceStatus.total,
          perc: this.selectedMarker.stationServiceStatus.available / this.selectedMarker.stationServiceStatus.total,
        };
      }
    },

    updateTimer(sign) {
      if (sign === `plus`) {
        this.hours += 1;
      } else {
        this.hours -= 1;
      }

      this.updateMarker();
    },

    setMarkers(map) {
      const markers = this.locations.map((location) => {
        // eslint-disable-next-line no-undef
        const marker = new google.maps.Marker({ ...location, map });
        marker.addListener(`click`, () =>
          this.markerClickHandler(this.map, marker));

        return marker;
      });

      // eslint-disable-next-line no-new
      new MarkerClusterer(map, markers, {
        imagePath: `https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m`,
      });
    },
  },
};
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

.layout {
  height: 100%;
}

.header {
  background: #ffffff !important;
  padding: 0;
  text-align: center;
}

.content {
  position: relative;
}

.maps {
  width: 100%;
  height: 100%;
}

.hover {
  position: absolute;
  bottom: 0px;
  width: 100%;
  padding: 0 60px 20px;
}

.ant-card-head-title h3 {
  margin: 0;
}

.selector-hours button{
  margin-left: 10px;
}
</style>
