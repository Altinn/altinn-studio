export const getDataTypesToSignMock = (dataTypesToSign: string[]) => ({
  rootElements: [
    {
      flowElements: [
        {
          $type: 'bpmn:Task',
          extensionElements: {
            values: [
              {
                $type: 'altinn:taskExtension',
                $children: [
                  {
                    $type: 'altinn:signatureConfig',
                    $children: [
                      {
                        $type: 'altinn:dataTypesToSign',
                        $children: dataTypesToSign.map((dataTypeToSign) => ({
                          $type: 'altinn:dataType',
                          $body: dataTypeToSign,
                        })),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
});
