function fitToMarkers(markers, map, zoom) {
    var bounds = new google.maps.LatLngBounds();

    // Create bounds from markers
    for (var index in markers) {
        var latlng = markers[index].getPosition();
        bounds.extend(latlng);
    }

    // Don't zoom in too far on only one marker
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
        var extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.01, bounds.getNorthEast().lng() + 0.01);
        var extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.01, bounds.getNorthEast().lng() - 0.01);
        bounds.extend(extendPoint1);
        bounds.extend(extendPoint2);
    }
    circle = new google.maps.Circle({
        center: bounds.getCenter(),
        map: map,
        radius: 400,
		clickable:false,
        fillOpacity: 1,
		fillColor: '#5cb2d1',
        strokeColor: '#313131',
        strokeOpacity: .4,
        strokeWeight: .8,		
		scrollwheel: false,
		disableDoubleClickZoom: true		
    });
    if (markers.length > 1) {
        map.fitBounds(bounds);
    }
    else if (markers.length == 1) {
        map.setCenter(bounds.getCenter());
        
        if( zoom != undefined && zoom != '' )
            map.setZoom( parseInt( zoom ) );
        else 
            map.setZoom( 7 );
    }
	if(circle) map.fitBounds(circle.getBounds());
}

function ResetMap(button, map_id, lat, lng, zoom) {

    var map_global = GetMapGlobal(map_id);

    map_global.map.setCenter(new google.maps.LatLng(lat, lng));
    map_global.map.setZoom(zoom);
    if (map_global.input_marker != undefined) {
        map_global.input_marker.setMap(null);
        map_global.input_marker = undefined;
    }

    if (map_global.info_window != undefined) {
        map_global.info_window.close();
        map_global.info_window = undefined;
    }

    map_global.input_position = undefined;
    $(button).closest('.ElementData').find('.AddressParts').html('');
    $(button).closest('.ElementData').find('.MapInput').attr('lat', '').attr('lng', '');
    $(button).closest('.ElementData').find('input[mapid]').val('');
}

function InitializeForInput(map_id, lat, lng, zoom, map_type, font_icon ) {
    
    var google_map_type = google.maps.MapTypeId.ROADMAP;

    switch( map_type )
    {
        case "Road":
            google_map_type = google.maps.MapTypeId.ROADMAP;
            break;
        case "Satellite":
            google_map_type = google.maps.MapTypeId.SATELLITE;
            break;
        case "Terrain":
            google_map_type = google.maps.MapTypeId.TERRAIN;
            break;
        case "Hybrid":
            google_map_type = google.maps.MapTypeId.HYBRID;
            break;
    }
   
    var myOptions = {
        center: new google.maps.LatLng(lat, lng),
        zoom: zoom,
        mapTypeId: google_map_type,
        scrollwheel: false,
        streetViewControl: false,
        panControl: false,
		disableDefaultUI: true,
		scrollwheel: false,
		disableDoubleClickZoom: true
    };

    var map = new google.maps.Map(document.getElementById(map_id), myOptions);

    var map_global = new MapGlobal(map_id, map);
    g_maps.push( map_global );

    map_global.zoom_level = zoom;
    google.maps.event.addListener(map, 'zoom_changed', function() {
        map_global.zoom_level = map.getZoom();
    });
}

var g_maps = [];
var g_current_map_global;

function MapGlobal(id, map) {
    this.id = id;
    this.map = map;
}

function CreateInfoBox() {

    if (g_current_map_global.info_window != undefined && g_current_map_global.info_window != null)
        return;

    var box_width = 200;
    var box_height = 200;
    var box_clearance_width = 40;
    var box_clearance_height = 40;

    g_current_map_global.info_window = new InfoBox({
        content: "",
        disableAutoPan: false,
        pixelOffset: new google.maps.Size(-box_width / 2, 15),
        zIndex: null,
        boxStyle: {
            width: box_width + "px",
            maxHeight: box_height + "px"
        },
        closeBoxMargin: "0px",
        boxWidth: box_width,
        boxHeight: box_height,
        closeBoxURL: "/images/close.png",
        tipBoxURL: "/images/tipbox2.png",
        infoBoxClearance: new google.maps.Size(box_clearance_width, box_clearance_height)
    });

}

function InitInputWithLocation(lat, lng, no_preview, zoom ) {
    
    var my_lat_lng = new google.maps.LatLng( lat, lng );

    if (no_preview) {

        if( typeof MarkerWithLabel == "function" )
        {
            g_current_map_global.input_marker = new MarkerWithLabel({
                position: my_lat_lng,
                draggable: false,
                raiseOnDrag: false,
                icon: ' ',
                map: g_current_map_global.map,
                labelContent: "<i class='fa fa-location IconMarker'></i>",
                labelAnchor: new google.maps.Point(17, 50),
                labelClass: "labels" // the CSS class for the label
            });
            
        } else
        {
            g_current_map_global.input_marker = new google.maps.Marker({
                position: my_lat_lng,
                map: g_current_map_global.map
            });
        }

        var noPoi = [
                {
                    featureType: "poi",
                    stylers: [
                      { visibility: "off" }
                    ]
                }
        ];

        g_current_map_global.map.setOptions({ styles: noPoi });
         
    } else {

        CreateInfoBox();

        g_current_map_global.input_marker = new google.maps.Marker({
            position: my_lat_lng,
            map: g_current_map_global.map,
            title: "Drag this marker to accurate location",
            draggable: true
        });

        g_current_map_global.info_window.setContent("<div style='padding:10px;'><b>Optional</b><br> You can drag this marker to<br> even more accurate location.</div>");
        g_current_map_global.info_window.open(g_current_map_global.map, g_current_map_global.input_marker);

        google.maps.event.addListener(g_current_map_global.input_marker, 'dragend', function () {
            g_current_map_global.input_position = this.getPosition();
            g_current_map_global.drag_start = 1;

            geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    'latLng': g_current_map_global.input_position,
                    'partialmatch': true
                }, MyGeoCodeResult);

        });

        if ($(".AddressParts[Id='" + g_current_map_global.id + "']").html() == "") {
            g_current_map_global.input_position = my_lat_lng;
            g_current_map_global.drag_start = 1;

            geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                'latLng': g_current_map_global.input_position,
                'partialmatch': true
            }, MyGeoCodeResult);
        }
    }

    fitToMarkers([g_current_map_global.input_marker], g_current_map_global.map, zoom);
        
    g_current_map_global.input_position = my_lat_lng;
}

function MyGeoCodeResult(results, status) {

    if (status == 'OK' && results.length > 0)
    {
        var my_result = results[0];

        if (results.length >= 2) {

            if (results[0].geometry.location_type == "ROOFTOP" && results[0].types[0] == "street_address" &&
                results[1].geometry.location_type == "APPROXIMATE" && (results[1].types[0] == "locality" || results[1].types[0] == "neighborhood" || results[1].types[0] == "bus_station" || results[1].types[0] == "postal_code")) {

                var short_name_one = ""
                $.each(results[0].address_components, function (i, v) {
                    if (v.types[0] == "locality")
                        short_name_one = v.short_name;
                });

                var short_name_two = ""
                $.each(results[1].address_components, function (i,v) {
                    if (v.types[0] == "locality")
                        short_name_two = v.short_name;
                });

                if (short_name_one != short_name_two)
                    my_result = results[1];
            }
        }

        if (g_current_map_global.input_marker == undefined) {
            
            CreateInfoBox();

            if (g_current_map_global.input_position != null)
                my_result.geometry.location = g_current_map_global.input_position;

            g_current_map_global.input_marker = new google.maps.Marker({
                position: my_result.geometry.location,
                map: g_current_map_global.map,
                title: "Drag this marker to accurate location",
                draggable: true
            });

            g_current_map_global.info_window.setContent("<div style='padding:10px;'><b>Optional</b><br> You can drag this marker to<br> even more accurate location.</div>");
            g_current_map_global.info_window.open(g_current_map_global.map, g_current_map_global.input_marker);

            google.maps.event.addListener(g_current_map_global.input_marker, 'dragend', function () {
                g_current_map_global.input_position = this.getPosition();
                g_current_map_global.drag_start = 1;

                geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    'latLng': g_current_map_global.input_position,
                    'partialmatch': true
                }, MyGeoCodeResult);
            });

            g_current_map_global.map.fitBounds(my_result.geometry.viewport);
            if (g_current_map_global.input_position != null) 
                g_current_map_global.map.setCenter(g_current_map_global.input_position);
            
            g_current_map_global.input_position = my_result.geometry.location;

        } else if (g_current_map_global.input_position == null) {

            g_current_map_global.input_marker.setPosition(my_result.geometry.location);
            g_current_map_global.map.fitBounds(my_result.geometry.viewport);
            g_current_map_global.input_position = my_result.geometry.location;

        } else if (g_current_map_global.input_position != null && g_current_map_global.drag_start != 1 ) {
            g_current_map_global.input_marker.setPosition(g_current_map_global.input_position);
            g_current_map_global.map.fitBounds(my_result.geometry.viewport);
            g_current_map_global.map.setCenter(g_current_map_global.input_position);
        }

        g_current_map_global.drag_start = 0;

        var address_components_str = "";

        $.each(my_result.address_components, function () {
            
            if( $.inArray( 'street_number', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>Street Number</span>: <span class='AddressPartValue' type='StreetNumber'>" + this.long_name + "</span></div>";
            else if( $.inArray( 'route', this.types ) != -1 || $.inArray( 'street_address', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>Street Address</span>: <span class='AddressPartValue' type='StreetAddress'>" + this.long_name + "</span></div>";
            else if( $.inArray( 'neighborhood', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>Neighbourhood</span>: <span class='AddressPartValue' type='Neighbourhood'>" + this.long_name + "</span></div>";
            else if( $.inArray( 'locality', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>City</span>: <span class='AddressPartValue' type='City'>" + this.long_name + "</span></div>";
            else if( $.inArray( 'administrative_area_level_2', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>County</span>: <span class='AddressPartValue' type='County'>" + this.long_name + "</span></div>";
            else if( $.inArray( 'administrative_area_level_1', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>State</span>: <span class='AddressPartValue' type='State'>" + this.long_name + "</span></div>";
            else if( $.inArray( 'country', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>Country</span>: <span class='AddressPartValue' type='Country'>" + this.long_name + "</span></div>";
            else if( $.inArray( 'postal_code', this.types ) != -1 )
                address_components_str += "<div class='AddressPart'><span class='AddressPartName'>Zip Code</span>: <span class='AddressPartValue' type='ZipCode'>" + this.long_name + "</span></div>";
        });

        $(".AddressParts[Id='" + g_current_map_global.id + "']").html( address_components_str );
                
    } else {
        alert("Geocode was not successful for the following reason: " + status);
    }
}

function GetMapGlobal(id) {

    for (i = 0; i < g_maps.length; i++)
        if (g_maps[i].id == id)
            return g_maps[i];

    return null;
}

function MyGeoCode(address, id) {

    g_current_map_global = GetMapGlobal(id);

    g_current_map_global.input_position = null;

    var split_coordinates = htmlDecode( address ).split(",");
    var lat = "dummy", lng = "dummy";

    if (split_coordinates.length == 2) {
        lat = magellan(split_coordinates[0].trim()).toDD();
        lng = magellan(split_coordinates[1].trim()).toDD();
    } else {

        split_coordinates = address.match(/[^ ]+/g);
        
        if (split_coordinates.length == 2) {
            lat = magellan(split_coordinates[0].trim()).toDD();
            lng = magellan(split_coordinates[1].trim()).toDD();
        }
    }

    geocoder = new google.maps.Geocoder();

    if (isNaN(lng) || isNaN(lat)) {
        geocoder.geocode({
            'address': address,
            'partialmatch': true
        }, MyGeoCodeResult);
    } else {

        g_current_map_global.input_position = new google.maps.LatLng(lat, lng);
        geocoder.geocode({
            'latLng': g_current_map_global.input_position,
            'partialmatch': true
        }, MyGeoCodeResult );
    }
}