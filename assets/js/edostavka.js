jQuery(function($){

    $(document).ready(function(){

        if( typeof( wc_checkout_params ) !== "undefined" && wc_checkout_params.is_checkout == 1 ) {

            $( 'body' ).on('updated_checkout', function () {

                var method = woocommerce_params.chosen_shipping_method;

                $( 'select.shipping_method, input[name^=shipping_method][type=radio]:checked, input[name^=shipping_method][type=hidden]' ).each( function( index, input ) {
                    method = $( this ).val();
                } );

                if( method && method.indexOf('edostavka_') >= 0 ) {
                    //Если СДЕК
                    var tatiff_id = method.replace('edostavka_','');

                    if( $.inArray( parseInt( tatiff_id ), woocommerce_params.is_door ) >= 0 ) {
                        //Если СДЕК до двери
                        $( '#billing_delivery_point_field, #edostavka_map' ).hide().addClass('hidden');
                        $( '#billing_address_1_field, #billing_address_2_field').show().removeClass('hidden');
                    } else {
                        //Если СДЕК до склада
                        $( '#billing_delivery_point_field, #edostavka_map' ).show().removeClass('hidden');
                        $( '#billing_address_1_field, #billing_address_2_field' ).hide().addClass('hidden');
                    }

                } else {
                    // Для всех остальных методов
                    $( '#billing_delivery_point_field, #edostavka_map' ).hide().addClass('hidden'); //Прячем ПВЗ
                    $( '#billing_address_1_field, #billing_address_2_field' ).show().removeClass('hidden'); //Показываем адрес
                }

            } );



            var delivery_point_select2 = function() {
                $( 'select#billing_delivery_point:visible' ).select2( {
                    minimumResultsForSearch: 10,
                    placeholder: 'Выберите ПВЗ',
                    placeholderOption: 'first',
                    width: '100%',
                } );
            };

            var delivery_points_map = function() {

                ymaps.ready(function () {

                    var contactmap;
                    var map_container = 'edostavka_map';
                    var points = $( '#' + map_container ).data('points');

                    ymaps.geocode( $( '#' + map_container ).data('state-name') , { results: 1 }).then( function( response ){

                        var getCoordinats = response.geoObjects.get(0).geometry.getCoordinates();
                        contactmap = new ymaps.Map( map_container, {
                            center: getCoordinats,
                            zoom: 14,
                            behaviors: ['default', 'scrollZoom'],
                            controls: []
                        });

                        $.map( points, function( point ) {
                            addPointToMap( point );
                        });

                        function addPointToMap( point ) {

                            placemark = new ymaps.Placemark( [ point.coordY, point.coordX ], {
                                balloonContentBody: [
                                    '<address>',
                                    '<strong>' + point.Name + '</strong>',
                                    '<br/>',
                                    'Адрес: г.' + point.City + ' ул.' + point.Address,
                                    '<br/>',
                                    'Телефон: ' + point.Phone,
                                    '<br/>',
                                    'Время работы: ' + point.WorkTime,
                                    '<br/>',
                                    'Дополнительно: ' + point.Note,
                                    '</address>'
                                ].join('')
                            } );

                            placemark.events.add('click', function( event ) {
                                $("select#billing_delivery_point")
                                    .val( point.Code )
                                    .select2( 'val', point.Code );
                            } );

                            contactmap.geoObjects.add( placemark );
                        };

                        if( contactmap.geoObjects.getLength() > 1 ) {
                            contactmap.setBounds( contactmap.geoObjects.getBounds() );
                        } else {
                            contactmap.setCenter( contactmap.geoObjects.get(0).geometry.getCoordinates() );
                        }

                    });

                });
            };



            var load_autocomplate_states = function() {

                try {
                    $('#billing_state').autocomplete({
                        source: function(request,response) {
                            $.ajax({
                                url: woocommerce_params.geo_json_url + '?callback=?',
                                method: 'POST',
                                dataType: "jsonp",
                                beforeSend: function( xhr ) {
                                    $(this).addClass( 'is_loading' );
                                    console.log(request.term);
                                },
                                data: {
                                    q: request.term,
                                    name_startsWith: request.term,
                                    countryCodeList: function () { return [$('#billing_country').val()] }
                                },
                                success: function( data ) {
                                    $(this).toggleClass( 'is_loading', 'is_loaded' );

                                    response( $.map ( data.geonames, function( item ) {
                                        if( item && item.countryCode !== null && ( item.countryCode == $('#billing_country').val() || item.countryIso == $('#billing_country').val()) ) {
                                            return {
                                                label: item.name,
                                                value: item.cityName,
                                                id: item.id
                                            }
                                        }

                                    }));
                                },
                                error: function( err ) {
                                    console.log( err );
                                }
                            });

                        },
                        minLength: 0,
                        select: function( event, ui ) {
                            $('#billing_city, #shippng_city').val( ui.item.value );
                            $('#billing_state, #shippng_state').val( ui.item.name );
                            $('#shipping_state_id').val( ui.item.id );

                            $( 'body' ).trigger('update_checkout');
                        }
                    }).on('focus', function() {
                        $( this ).autocomplete('search');
                    });
                } catch( error ) {
                    console.log( error );
                }
            };

            //load_autocomplate_states();

            $( 'body' ).on('updated_checkout', function(){
                if ( $('#billing_delivery_point option').length > 0 && $().select2 ) {

                    $( '#billing_delivery_point_field' ).find( '.select2-container' ).remove();
                    $('div#edostavka_map').empty();
                    delivery_point_select2();
                    delivery_points_map();

                }

                load_autocomplate_states();
            } );
        }
    });

});