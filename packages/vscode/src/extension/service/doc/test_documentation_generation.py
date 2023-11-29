import requests
import json

embedding_url = 'https://codemuse-app--generate-embedding.modal.run'  # Replace with your actual URL
documentation_url = 'https://codemuse-app--generate-documentation.modal.run'

headers = {
    'Content-Type': 'application/json'
}

data = {
    'code': """def create(self, request):
        error = check_permission(request.user, "rtcmdmodels.add_request")

        if error:
            return error

        try:
            with transaction.atomic():
                data = request.data
                total_quantity = 0
                for t in data.get("trades"):
                    total_quantity += float(t.get("quantity"))
                
                ## validation
                list_of_indexes_for_maturity_check = [ Maturity.objects.get(id = e.get("maturity")).get_number_compared_to_cash_or_cash for e in data.get("trades")]

                max_volume_uptick = VolumeUptickModel.objects.aggregate(Max('maximum'))
                if total_quantity > float(max_volume_uptick['maximum__max']):
                    raise ValidationError(f"Total quantity exceeds {max_volume_uptick['maximum__max']}mt, "
                                          f"please contact marketsdesk@riotinto.com for a quote.")
                
                if not validate_spreads(list_of_indexes_for_maturity_check):
                    raise ValidationError("Spread Alert: Spreads in system could be off. Please use manual quotes.")

                quote = AutoQuoteView(obj=data, requestor=request.user)
                quote.save_to_db()
                
                add_plant_details(quote.db_object, data.get('plant_details', []))
                create_trades_for_auto_quote(quote, data.get('trades'), data.get('instruments'))

                quote.session.stop()

                log = RequestMiddleWare.get_current_request().log
                if log:
                    quote.db_object.log_for_autoquotes(log) #logging

                histories = quote.db_object.history.all()
                if histories.count() > 1:
                    histories[0].delete()

                serialized_data = LightRequestSerializer(quote.db_object)
                send_request_create(serialized_data.data)

                schedule_expiry_for_quotes(quote.db_object)

                return Response({'id': serialized_data.data['id'], 'type': serialized_data.data['request_type']}, status=200)

        except ValidationError as e:
            return Response({"error": e}, status=400)
        except Maturity.DoesNotExist:
            return Response({"error":"Maturity not found in database"},status = 400)
        except Instrument.DoesNotExist:
            return Response({"error":"Instrument not found in database"},status = 400)"""
}

response = requests.post(documentation_url, headers=headers, data=json.dumps(data))

print(response.text)